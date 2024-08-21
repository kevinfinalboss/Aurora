const { ActivityType } = require("discord.js");
const client = require("../../client");
const { logger } = require("../../functions/logger");

const activities = [
    { name: "você", type: ActivityType.Watching },
    { name: "música relaxante", type: ActivityType.Listening },
    { name: "um jogo divertido", type: ActivityType.Playing },
    { name: "dicas úteis", type: ActivityType.Streaming, url: "https://www.twitch.tv/kevinterrorista" }
];

const statuses = ["online", "idle", "dnd"];

function setRandomPresence() {
    const activity = activities[Math.floor(Math.random() * activities.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    client.user.setPresence({
        activities: [activity],
        status: status
    });

    logger(`Presença atualizada: ${activity.type} ${activity.name} | Status: ${status}`, "info");
}

client.on("ready", async () => {
    console.log("\n---------------------");
    logger(`${client.user.tag} está pronto!`, "success");
    console.log("---------------------");

    setRandomPresence();

    setInterval(setRandomPresence, 5 * 60 * 1000);
});