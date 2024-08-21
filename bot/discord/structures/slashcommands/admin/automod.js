const { Client, CommandInteraction, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require("discord.js");

module.exports = {
    name: "automod",
    description: "Configura as opções do AutoMod",
    options: [],

    /**
     * 
     * @param {Client} client 
     * @param {CommandInteraction} interaction 
     */

    run: async (client, interaction) => {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: "Você não tem permissão para usar este comando.", ephemeral: true });
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('automod_action')
            .setPlaceholder('Selecione uma ação')
            .addOptions([
                { label: 'Adicionar palavra', value: 'add_word' },
                { label: 'Remover palavra', value: 'remove_word' },
                { label: 'Listar palavras', value: 'list_words' },
                { label: 'Definir limite de menções', value: 'set_mentions' },
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
                case 'add_word':
                    await handleAddWord(i, client);
                    break;
                case 'remove_word':
                    await handleRemoveWord(i, client);
                    break;
                case 'list_words':
                    await handleListWords(i, client);
                    break;
                case 'set_mentions':
                    await handleSetMentions(i, client);
                    break;
            }
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] });
        });
    }
};

async function handleAddWord(interaction, client) {
    await interaction.reply({ content: 'Digite a palavra que deseja adicionar:', ephemeral: true });
    
    const filter = m => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

    collector.on('collect', async (m) => {
        const word = m.content.toLowerCase();
        if (!client.bannedWords) {
            client.bannedWords = [];
        }
        if (client.bannedWords.includes(word)) {
            await interaction.followUp({ content: 'Esta palavra já está na lista de palavras banidas.', ephemeral: true });
        } else {
            client.bannedWords.push(word);
            await interaction.followUp({ content: `A palavra "${word}" foi adicionada à lista de palavras banidas.`, ephemeral: true });
        }
    });
}

async function handleRemoveWord(interaction, client) {
    if (!client.bannedWords || client.bannedWords.length === 0) {
        return interaction.reply({ content: 'Não há palavras na lista de palavras banidas.', ephemeral: true });
    }

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('remove_word')
        .setPlaceholder('Selecione uma palavra para remover')
        .addOptions(client.bannedWords.map(word => ({ label: word, value: word })));

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
        const index = client.bannedWords.indexOf(wordToRemove);
        if (index > -1) {
            client.bannedWords.splice(index, 1);
            await i.update({ content: `A palavra "${wordToRemove}" foi removida da lista de palavras banidas.`, components: [] });
        } else {
            await i.update({ content: 'Erro ao remover a palavra. Tente novamente.', components: [] });
        }
    });
}

async function handleListWords(interaction, client) {
    if (!client.bannedWords || client.bannedWords.length === 0) {
        return interaction.reply({ content: 'Não há palavras na lista de palavras banidas.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Lista de Palavras Banidas')
        .setDescription(client.bannedWords.join(', '))
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleSetMentions(interaction, client) {
    await interaction.reply({ content: 'Digite o novo limite de menções (1-20):', ephemeral: true });
    
    const filter = m => m.author.id === interaction.user.id && !isNaN(m.content) && m.content >= 1 && m.content <= 20;
    const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

    collector.on('collect', async (m) => {
        const limit = parseInt(m.content);
        client.maxMentions = limit;
        await interaction.followUp({ content: `O limite de menções foi definido para ${limit}.`, ephemeral: true });
    });
}