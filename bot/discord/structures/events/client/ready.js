const { ActivityType } = require("discord.js");
const { logger } = require("../../functions/logger");

function setInteractivePresence(client) {
    const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
    const totalGuilds = client.guilds.cache.size;

    const activities = [
        { name: `👥 Ajudando ${totalUsers} usuários com moderação`, type: ActivityType.Playing },
        { name: `🔧 Configurando ${totalGuilds} servidores`, type: ActivityType.Watching },
        { name: "🎵 Tocando músicas de alta qualidade", type: ActivityType.Listening },
        { name: "💼 Acompanhando cotações financeiras", type: ActivityType.Watching },
        { name: "📈 Monitorando a inflação global", type: ActivityType.Watching },
        { name: "👥 Dando boas-vindas aos novos membros", type: ActivityType.Watching },
        { name: "🛠️ Personalizando o servidor", type: ActivityType.Playing },
        { name: "🎮 Jogando com novos comandos", type: ActivityType.Playing },
        { name: "🌐 Ajudando em ${totalGuilds} servidores", type: ActivityType.Watching },
        { name: "📜 Use /help para ver os comandos", type: ActivityType.Playing }
    ];

    const statuses = ["online", "idle", "dnd"];

    const activity = activities[Math.floor(Math.random() * activities.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    client.user.setPresence({
        activities: [activity],
        status: status
    });

    logger(`Presença atualizada: ${activity.type} ${activity.name} | Status: ${status}`, "info");
}

async function checkExistingGuilds(client) {
    const guilds = client.guilds.cache;
    
    for (const [guildId, guild] of guilds) {
        try {
            const existingGuild = await Guild.findOne({ guildId: guildId });
            
            if (!existingGuild) {
                await updateGuildInfo(client, guild);
                logger(`Informações do servidor ${guild.name} adicionadas ao banco de dados`, 'info');
            } else {
                await updateGuildInfo(client, guild);
                logger(`Informações do servidor ${guild.name} atualizadas no banco de dados`, 'info');
            }
        } catch (error) {
            logger(`Erro ao processar servidor ${guild.name}: ${error.message}`, 'error');
        }
    }
}

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

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute: async (client) => {
        console.log("\n---------------------");
        logger(`${client.user.tag} está pronto!`, "success");
        console.log("---------------------");

        setInteractivePresence(client);

        try {
            await checkExistingGuilds(client);
            logger('Verificação de servidores existentes concluída', 'info');
        } catch (error) {
            logger(`Erro ao verificar servidores existentes: ${error.message}`, 'error');
        }

        setInterval(() => setInteractivePresence(client), 5 * 60 * 1000);
    }
};