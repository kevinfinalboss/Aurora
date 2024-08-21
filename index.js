const initializeClient = require("./bot/discord/structures/client");
const { ShardingManager } = require("discord.js");
const { loadConfig } = require("./bot/discord/structures/configuration/index");
const { logger } = require("./bot/discord/structures/functions/logger");

async function startBot() {
    try {
        const config = await loadConfig();

        if (!config.client_id) {
            logger("Couldn't find the client ID in the config file.", "error");
            process.exit(1);
        }

        if (!config.client_token) {
            logger("Couldn't find the client token in the config file.", "error");
            process.exit(1);
        }

        if (config.sharding) {
            const manager = new ShardingManager("./bot/discord/structures/client.js", {
                token: config.client_token,
                totalShards: "auto"
            });

            manager.on("shardCreate", shard => {
                logger(`Launched shard ${shard.id}`, "info");
            });

            manager.spawn();
        } else {
            console.log("Iniciando o bot sem sharding...");
            try {
                const client = await initializeClient();
                console.log("Bot iniciado com sucesso.");
            } catch (error) {
                console.error("Erro ao iniciar o bot:", error);
                process.exit(1);
            }
        }

        if (config.database) {
            console.log("Conectando ao banco de dados...");
            try {
                console.log("URL do MongoDB:", config.mongodb_url);

                await require("./bot/discord/structures/database/connect").connect(config.mongodb_url);
                console.log("Conexão com o banco de dados estabelecida com sucesso.");
            } catch (error) {
                console.error("Erro ao conectar ao banco de dados:", error);
                process.exit(1);
            }
        }

        console.log("Processo de inicialização concluído.");
    } catch (error) {
        logger(`Failed to start the bot: ${error.message}`, "error");
        console.error("Stack trace completo:", error);
        process.exit(1);
    }
}

startBot();
