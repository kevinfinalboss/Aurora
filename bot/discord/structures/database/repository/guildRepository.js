const Guild = require('../schema/migrations');

class GuildRepository {
    async getGuildSettings(guildId) {
        let guild = await Guild.findOne({ guildId });
        if (!guild) {
            guild = await Guild.create({ guildId, automod: { enabled: false } });
        }
        return guild;
    }

    async updateAutomodSettings(guildId, settings) {
        return await Guild.findOneAndUpdate(
            { guildId },
            { $set: { automod: settings } },
            { new: true, upsert: true }
        );
    }

    async addBannedWord(guildId, word) {
        return await Guild.findOneAndUpdate(
            { guildId },
            { $addToSet: { 'automod.bannedWords': word } },
            { new: true, upsert: true }
        );
    }

    async removeBannedWord(guildId, word) {
        return await Guild.findOneAndUpdate(
            { guildId },
            { $pull: { 'automod.bannedWords': word } },
            { new: true }
        );
    }

    async setMaxMentions(guildId, maxMentions) {
        return await Guild.findOneAndUpdate(
            { guildId },
            { $set: { 'automod.maxMentions': maxMentions } },
            { new: true, upsert: true }
        );
    }
}

module.exports = new GuildRepository();