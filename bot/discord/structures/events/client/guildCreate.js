const { Events } = require('discord.js');
const Guild = require('../../database/schema/migrations');
const { logger } = require('../../functions/logger');

module.exports = {
    name: Events.GuildCreate,
    once: false,
    execute: async (client, guild) => {
        try {
            await updateGuildInfo(client, guild);
            logger(`Bot entrou no servidor: ${guild.name}`, 'info');
        } catch (error) {
            logger(`Erro ao processar novo servidor ${guild.name}: ${error.message}`, 'error');
        }
    }
};

async function updateGuildInfo(client, guild) {
    const guildData = {
        clientId: client.user.id,
        guildId: guild.id,
        name: guild.name,
        ownerId: guild.ownerId,
        region: guild.preferredLocale,
        memberCount: guild.memberCount,
        large: guild.large,
        icon: guild.icon,
        splash: guild.splash,
        channels: guild.channels.cache.map(channel => ({
            channelId: channel.id,
            name: channel.name,
            type: channel.type,
            topic: channel.topic,
            nsfw: channel.nsfw,
            position: channel.position,
        })),
        roles: guild.roles.cache.map(role => ({
            roleId: role.id,
            name: role.name,
            color: role.hexColor,
            hoist: role.hoist,
            position: role.position,
            permissions: role.permissions.toArray(),
        })),
        members: guild.members.cache.map(member => ({
            userId: member.user.id,
            username: member.user.username,
            discriminator: member.user.discriminator,
            nickname: member.nickname,
            roles: member.roles.cache.map(role => role.id),
            joinedAt: member.joinedAt,
            isBot: member.user.bot,
        })),
    };

    await Guild.findOneAndUpdate(
        { guildId: guild.id },
        guildData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
}