const { ActivityType } = require("discord.js");
const { logger } = require("../../functions/logger");

function setInteractivePresence(client) {
    const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
    const totalGuilds = client.guilds.cache.size;

    const activities = [
        { name: `Ajudando ${totalUsers} usuários`, type: ActivityType.Playing },
        { name: `Configurando ${totalGuilds} servidores`, type: ActivityType.Watching },
        { name: "você", type: ActivityType.Watching },
        { name: "música relaxante", type: ActivityType.Listening },
        { name: "um jogo divertido", type: ActivityType.Playing },
        { name: "dicas úteis", type: ActivityType.Streaming, url: "https://www.twitch.tv/kevinterrorista" }
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

module.exports = {
    name: 'ready',
    execute: (client) => {
        console.log("\n---------------------");
        logger(`${client.user.tag} está pronto!`, "success");
        console.log("---------------------");

        setInteractivePresence(client);

        setInterval(() => setInteractivePresence(client), 5 * 60 * 1000);
    }
};