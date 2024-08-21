const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ModalBuilder, 
    ActionRowBuilder, 
    TextInputBuilder, 
    TextInputStyle
} = require('discord.js');
const guildRepository = require('../../database/repository/guildRepository');
const { logger } = require('../../functions/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Configura as opções do AutoMod')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('automod-config')
            .setTitle('Configuração do AutoMod');

        const enabledInput = new TextInputBuilder()
            .setCustomId('enabled')
            .setLabel('Ativar AutoMod (true/false)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const bannedWordsInput = new TextInputBuilder()
            .setCustomId('bannedWords')
            .setLabel('Palavras banidas (separadas por vírgula)')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        const maxMentionsInput = new TextInputBuilder()
            .setCustomId('maxMentions')
            .setLabel('Máximo de menções permitidas')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const logChannelInput = new TextInputBuilder()
            .setCustomId('logChannel')
            .setLabel('ID do canal de log')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const explicitFilterInput = new TextInputBuilder()
            .setCustomId('explicitFilter')
            .setLabel('Filtro de imagens explícitas (true/false)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(enabledInput),
            new ActionRowBuilder().addComponents(bannedWordsInput),
            new ActionRowBuilder().addComponents(maxMentionsInput),
            new ActionRowBuilder().addComponents(logChannelInput),
            new ActionRowBuilder().addComponents(explicitFilterInput)
        );

        await interaction.showModal(modal);
    },

    async handleModalSubmit(interaction) {
        try {
            const enabled = interaction.fields.getTextInputValue('enabled') === 'true';
            const bannedWords = interaction.fields.getTextInputValue('bannedWords').split(',').map(word => word.trim());
            const maxMentions = parseInt(interaction.fields.getTextInputValue('maxMentions'));
            const logChannelId = interaction.fields.getTextInputValue('logChannel');
            const explicitImageFilter = interaction.fields.getTextInputValue('explicitFilter') === 'true';

            logger(`Atualizando configurações do AutoMod para a guild ${interaction.guildId}`, 'info');

            const updatedSettings = await guildRepository.updateAutomodSettings(interaction.guildId, {
                enabled,
                bannedWords,
                maxMentions,
                logChannelId,
                explicitImageFilter
            });

            logger(`Configurações do AutoMod atualizadas para a guild ${interaction.guildId}`, 'info');
            logger(`Novas configurações: ${JSON.stringify(updatedSettings)}`, 'debug');

            await interaction.reply({ content: 'Configurações do AutoMod atualizadas com sucesso!', ephemeral: true });
        } catch (error) {
            logger(`Erro ao atualizar configurações do AutoMod: ${error.message}`, 'error');
            await interaction.reply({ content: 'Ocorreu um erro ao atualizar as configurações do AutoMod.', ephemeral: true });
        }
    }
};