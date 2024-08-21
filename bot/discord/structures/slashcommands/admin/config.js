const { CommandInteraction, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require("discord.js");
const guildRepository = require('../../database/repository/guildRepository');
const { logger } = require('../../functions/logger');

module.exports = {
    name: "config",
    description: "Configura as opções do servidor",
    options: [],

    run: async (client, interaction) => {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            logger(`Usuário ${interaction.user.tag} tentou usar o comando Config sem permissão na guild ${interaction.guildId}`, 'warn');
            return interaction.reply({ content: "Você não tem permissão para usar este comando.", ephemeral: true });
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('config_action')
            .setPlaceholder('Selecione uma ação')
            .addOptions([
                { label: 'Definir canal de entrada de membros', value: 'set_welcome_channel' },
                { label: 'Definir canal de saída de membros', value: 'set_leave_channel' },
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const response = await interaction.reply({
            content: 'Selecione uma ação para configurar:',
            components: [row],
            ephemeral: true,
        });

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 60000,
        });

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                logger(`Usuário ${i.user.tag} tentou usar o menu de Config sem permissão na guild ${interaction.guildId}`, 'warn');
                return i.reply({ content: 'Você não pode usar este menu.', ephemeral: true });
            }

            switch (i.values[0]) {
                case 'set_welcome_channel':
                    await handleSetWelcomeChannel(i);
                    break;
                case 'set_leave_channel':
                    await handleSetLeaveChannel(i);
                    break;
            }
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] });
        });
    }
};

async function handleSetWelcomeChannel(interaction) {
    await interaction.update({ content: 'Mencione o canal que deseja definir como canal de entrada de membros:', components: [] });
    
    const filter = m => m.author.id === interaction.user.id && m.mentions.channels.size > 0;
    const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

    collector.on('collect', async (m) => {
        const channel = m.mentions.channels.first();
        logger(`Definindo canal de entrada de membros para ${channel.name} (${channel.id}) na guild ${interaction.guildId}`, 'info');
        await guildRepository.updateGuildSettings(interaction.guildId, { welcomeChannelId: channel.id });
        logger(`Canal de entrada de membros definido para ${channel.name} (${channel.id}) na guild ${interaction.guildId}`, 'info');
        await interaction.editReply({ content: `O canal de entrada de membros foi definido para ${channel}.` });
    });
}

async function handleSetLeaveChannel(interaction) {
    await interaction.update({ content: 'Mencione o canal que deseja definir como canal de saída de membros:', components: [] });
    
    const filter = m => m.author.id === interaction.user.id && m.mentions.channels.size > 0;
    const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

    collector.on('collect', async (m) => {
        const channel = m.mentions.channels.first();
        logger(`Definindo canal de saída de membros para ${channel.name} (${channel.id}) na guild ${interaction.guildId}`, 'info');
        await guildRepository.updateGuildSettings(interaction.guildId, { leaveChannelId: channel.id });
        logger(`Canal de saída de membros definido para ${channel.name} (${channel.id}) na guild ${interaction.guildId}`, 'info');
        await interaction.editReply({ content: `O canal de saída de membros foi definido para ${channel}.` });
    });
}