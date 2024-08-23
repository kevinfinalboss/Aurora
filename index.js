const { ShardingManager } = require("discord.js");
const { loadConfig } = require("./bot/discord/structures/configuration/index");
const { logger } = require("./bot/discord/structures/functions/logger");
const mongoose = require("mongoose");

let client, manager;

async function startBot() {
    try {
        const config = await loadConfig();

        if (!config.client_id || !config.client_token) {
            logger("Couldn't find the client ID or token in the config file.", "error");
            process.exit(1);
        }

        if (config.sharding) {
            manager = new ShardingManager("./bot/discord/structures/client.js", {
                token: config.client_token,
                totalShards: "auto"
            });

            manager.on("shardCreate", shard => {
                logger(`Launched shard ${shard.id}`, "info");
            });

            await manager.spawn();
            logger("Sharding manager started successfully.", "info");
        } else {
            logger("Iniciando o bot sem sharding...", "info");
            try {
                const { initializeClient } = require("./bot/discord/structures/client");
                client = await initializeClient();
                logger("Bot iniciado com sucesso.", "info");
            } catch (error) {
                logger(`Erro ao iniciar o bot: ${error.message}`, "error");
                console.error(error);
                process.exit(1);
            }
        }

        if (config.database) {
            logger("Conectando ao banco de dados...", "info");
            try {
                await require("./bot/discord/structures/database/connect").connect(config.mongodb_url);
                logger("Conexão com o banco de dados estabelecida com sucesso.", "info");
            } catch (error) {
                logger(`Erro ao conectar ao banco de dados: ${error.message}`, "error");
                console.error(error);
                process.exit(1);
            }
        }

        logger("Processo de inicialização concluído.", "info");
    } catch (error) {
        logger(`Failed to start the bot: ${error.message}`, "error");
        console.error("Stack trace completo:", error);
        process.exit(1);
    }
}

async function gracefulShutdown() {
    logger("Encerrando o bot de forma graciosa...", "info");
    if (client) {
        await client.destroy();
    }
    if (manager) {
        await Promise.all(manager.shards.map(shard => shard.kill()));
    }
    if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close(false);
        logger("Conexão com o banco de dados fechada.", "info");
    }
    process.exit(0);
}

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

startBot().catch(error => {
    logger(`Erro não tratado durante a inicialização: ${error.message}`, "error");
    console.error(error);
    process.exit(1);
});