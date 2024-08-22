const { Riffy } = require("riffy");
const config = require("../configuration/index");

const nodes = [
    {
        host: config.lavalink_url,
        port: 80,
        password: config.lavalink_password,
        secure: false
    },
];


function setupRiffy(client) {
    client.riffy = new Riffy(client, nodes, {
        send: (payload) => {
            const guild = client.guilds.cache.get(payload.d.guild_id);
            if (guild) guild.shard.send(payload);
        },
        defaultSearchPlatform: "ytmsearch",
        restVersion: "v4" 
    });

    client.on("ready", () => {
        client.riffy.init(client.user.id);
    });

    client.on("raw", (d) => {
        client.riffy.updateVoiceState(d);
    });
}

module.exports = { setupRiffy };