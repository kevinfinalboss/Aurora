const { Riffy } = require("riffy");
const { loadConfig } = require("../configuration/index");
const { logger } = require('../functions/logger');

async function setupRiffy(client) {
    console.log("Iniciando setupRiffy...");

    try {
        const config = await loadConfig();
        console.log("Configuração carregada para Lavalink:", config.lavalink_url);

        if (!config.lavalink_url || !config.lavalink_password) {
            console.error("Configurações do Lavalink estão faltando.");
            return null;
        }

        const nodes = [
            {
                host: config.lavalink_url,
                port: 2334,
                password: config.lavalink_password,
                secure: false
            },
        ];

        console.log("Nós configurados:", nodes[0].host);

        client.riffy = new Riffy(client, nodes, {
            send: (payload) => {
                console.log("Payload recebido para guild:", payload.d.guild_id);
                const guild = client.guilds.cache.get(payload.d.guild_id);
                if (guild) {
                    console.log("Guild encontrada, enviando payload...");
                    guild.shard.send(payload);
                } else {
                    console.log("Guild não encontrada para o payload.");
                }
            },
            defaultSearchPlatform: "ytmsearch",
            restVersion: "v4" 
        });

        console.log("Riffy instanciado.");

        client.riffy.on("nodeConnect", (node) => {
            console.log("Evento nodeConnect recebido:", node.host);
            logger(`Nó Riffy conectado: ${node.host}`, "info");
        });

        client.riffy.on("nodeError", (node, error) => {
            console.log("Evento nodeError recebido:", node.host, error.message);
            logger(`Erro no nó Riffy ${node.host}: ${error.message}`, "error");
        });

        client.riffy.on("nodeDisconnect", (node) => {
            console.log("Evento nodeDisconnect recebido:", node.host);
            logger(`Nó Riffy desconectado: ${node.host}`, "warn");
        });

        client.on("ready", () => {
            console.log("Evento ready do cliente recebido.");
            logger("Cliente pronto, inicializando Riffy...", "info");
            client.riffy.init(client.user.id);
        });

        client.on("raw", (d) => {
            if (d.t === "VOICE_STATE_UPDATE" || d.t === "VOICE_SERVER_UPDATE") {
                console.log("Evento raw relevante recebido:", d.t);
                client.riffy.updateVoiceState(d);
            }
        });

        console.log("setupRiffy concluído com sucesso.");
        return client.riffy;
    } catch (error) {
        console.error("Erro em setupRiffy:", error.message);
        logger(`Erro ao configurar Riffy: ${error.message}`, "error");
        return null;
    }
}

module.exports = { setupRiffy };