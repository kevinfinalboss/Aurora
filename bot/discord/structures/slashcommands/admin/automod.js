const { Client, CommandInteraction, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require("discord.js");
const guildRepository = require('../../database/repository/guildRepository');

module.exports = {
    name: "automod",
    description: "Configura as opções do AutoMod",
    options: [],

    run: async (client, interaction) => {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: "Você não tem permissão para usar este comando.", ephemeral: true });
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('automod_action')
            .setPlaceholder('Selecione uma ação')
            .addOptions([
                { label: 'Ativar/Desativar AutoMod', value: 'toggle_automod' },
                { label: 'Adicionar palavra', value: 'add_word' },
                { label: 'Remover palavra', value: 'remove_word' },
                { label: 'Listar palavras', value: 'list_words' },
                { label: 'Definir limite de menções', value: 'set_mentions' },
                { label: 'Definir canal de log', value: 'set_log_channel' },
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const response = await interaction.reply({
            content: 'Selecione uma ação para o AutoMod:',
            components: [row],
            ephemeral: true,
        });

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 60000,
        });

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'Você não pode usar este menu.', ephemeral: true });
            }

            switch (i.values[0]) {
                case 'toggle_automod':
                    await handleToggleAutomod(i);
                    break;
                case 'add_word':
                    await handleAddWord(i);
                    break;
                case 'remove_word':
                    await handleRemoveWord(i);
                    break;
                case 'list_words':
                    await handleListWords(i);
                    break;
                case 'set_mentions':
                    await handleSetMentions(i);
                    break;
                case 'set_log_channel':
                    await handleSetLogChannel(i);
                    break;
            }
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] });
        });
    }
};

async function handleToggleAutomod(interaction) {
    const guildSettings = await guildRepository.getGuildSettings(interaction.guildId);
    const newState = !guildSettings.automod.enabled;
    await guildRepository.updateAutomodSettings(interaction.guildId, { ...guildSettings.automod, enabled: newState });
    await interaction.reply({ content: `AutoMod foi ${newState ? 'ativado' : 'desativado'} para este servidor.`, ephemeral: true });
}

async function handleAddWord(interaction) {
    await interaction.reply({ content: 'Digite a palavra que deseja adicionar:', ephemeral: true });
    
    const filter = m => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

    collector.on('collect', async (m) => {
        const word = m.content.toLowerCase();
        await guildRepository.addBannedWord(interaction.guildId, word);
        await interaction.followUp({ content: `A palavra "${word}" foi adicionada à lista de palavras banidas.`, ephemeral: true });
    });
}

async function handleRemoveWord(interaction) {
    const guildSettings = await guildRepository.getGuildSettings(interaction.guildId);
    if (!guildSettings.automod.bannedWords || guildSettings.automod.bannedWords.length === 0) {
        return interaction.reply({ content: 'Não há palavras na lista de palavras banidas.', ephemeral: true });
    }

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('remove_word')
        .setPlaceholder('Selecione uma palavra para remover')
        .addOptions(guildSettings.automod.bannedWords.map(word => ({ label: word, value: word })));

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({
        content: 'Selecione a palavra que deseja remover:',
        components: [row],
        ephemeral: true,
    });

    const collector = interaction.channel.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 30000,
    });

    collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) {
            return i.reply({ content: 'Você não pode usar este menu.', ephemeral: true });
        }

        const wordToRemove = i.values[0];
        await guildRepository.removeBannedWord(interaction.guildId, wordToRemove);
        await i.update({ content: `A palavra "${wordToRemove}" foi removida da lista de palavras banidas.`, components: [] });
    });
}

async function handleListWords(interaction) {
    const guildSettings = await guildRepository.getGuildSettings(interaction.guildId);
    if (!guildSettings.automod.bannedWords || guildSettings.automod.bannedWords.length === 0) {
        return interaction.reply({ content: 'Não há palavras na lista de palavras banidas.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Lista de Palavras Banidas')
        .setDescription(guildSettings.automod.bannedWords.join(', '))
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleSetMentions(interaction) {
    await interaction.reply({ content: 'Digite o novo limite de menções (1-20):', ephemeral: true });
    
    const filter = m => m.author.id === interaction.user.id && !isNaN(m.content) && m.content >= 1 && m.content <= 20;
    const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

    collector.on('collect', async (m) => {
        const limit = parseInt(m.content);
        await guildRepository.setMaxMentions(interaction.guildId, limit);
        await interaction.followUp({ content: `O limite de menções foi definido para ${limit}.`, ephemeral: true });
    });
}

async function handleSetLogChannel(interaction) {
    await interaction.reply({ content: 'Mencione o canal que deseja definir como canal de log do AutoMod:', ephemeral: true });
    
    const filter = m => m.author.id === interaction.user.id && m.mentions.channels.size > 0;
    const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

    collector.on('collect', async (m) => {
        const channel = m.mentions.channels.first();
        await guildRepository.updateAutomodSettings(interaction.guildId, { logChannelId: channel.id });
        await interaction.followUp({ content: `O canal de log do AutoMod foi definido para ${channel}.`, ephemeral: true });
    });
}