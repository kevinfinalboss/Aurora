const Guild = require('../schema/migrations');
const { logger } = require('../../functions/logger');

class GuildRepository {
    async getGuildSettings(guildId) {
        logger(`Buscando configurações para a guild: ${guildId}`, 'info');
        let guild = await Guild.findOne({ guildId });
        if (!guild) {
            logger(`Guild ${guildId} não encontrada, criando nova entrada`, 'info');
            guild = await Guild.create({ guildId, automod: { enabled: false, explicitImageFilter: false } });
        }
        logger(`Configurações recuperadas para a guild ${guildId}`, 'info');
        return guild;
    }

    async updateAutomodSettings(guildId, settings) {
        logger(`Atualizando configurações do AutoMod para a guild: ${guildId}`, 'info');
        const result = await Guild.findOneAndUpdate(
            { guildId },
            { $set: { automod: settings } },
            { new: true, upsert: true }
        );
        
        if (result) {
            logger(`Configurações do AutoMod atualizadas para a guild ${guildId}`, 'info');
        } else {
            logger(`Falha ao atualizar configurações do AutoMod para a guild ${guildId}`, 'error');
        }
        
        return result;
    }    

    async addBannedWord(guildId, word) {
        logger(`Adicionando palavra banida para a guild: ${guildId}`, 'info');
        const result = await Guild.findOneAndUpdate(
            { guildId },
            { $addToSet: { 'automod.bannedWords': word } },
            { new: true, upsert: true }
        );
        logger(`Palavra banida adicionada para a guild ${guildId}`, 'info');
        return result;
    }

    async removeBannedWord(guildId, word) {
        logger(`Removendo palavra banida para a guild: ${guildId}`, 'info');
        const result = await Guild.findOneAndUpdate(
            { guildId },
            { $pull: { 'automod.bannedWords': word } },
            { new: true }
        );
        logger(`Palavra banida removida para a guild ${guildId}`, 'info');
        return result;
    }

    async setMaxMentions(guildId, maxMentions) {
        logger(`Definindo limite máximo de menções para a guild: ${guildId}`, 'info');
        const result = await Guild.findOneAndUpdate(
            { guildId },
            { $set: { 'automod.maxMentions': maxMentions } },
            { new: true, upsert: true }
        );
        logger(`Limite máximo de menções definido para a guild ${guildId}`, 'info');
        return result;
    }

    async toggleExplicitImageFilter(guildId) {
        logger(`Alternando filtro de imagens explícitas para a guild: ${guildId}`, 'info');
        const guild = await this.getGuildSettings(guildId);
        const newState = !guild.automod.explicitImageFilter;
        const result = await Guild.findOneAndUpdate(
            { guildId },
            { $set: { 'automod.explicitImageFilter': newState } },
            { new: true }
        );
        logger(`Filtro de imagens explícitas alternado para ${newState} na guild ${guildId}`, 'info');
        return result;
    }

    async updateGuildSettings(guildId, settings) {
        logger(`Atualizando configurações para a guild: ${guildId}`, 'info');
        const result = await Guild.findOneAndUpdate(
            { guildId },
            { $set: settings },
            { new: true, upsert: true }
        );
        
        if (result) {
            logger(`Configurações atualizadas para a guild ${guildId}`, 'info');
        } else {
            logger(`Falha ao atualizar configurações para a guild ${guildId}`, 'error');
        }
        
        return result;
    }
}

module.exports = new GuildRepository();