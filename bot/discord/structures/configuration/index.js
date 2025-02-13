const { getConfigValues } = require("../aws/parameter-store/retrieve-stores");

async function loadConfig() {
    try {
        const awsConfig = await getConfigValues();

        const config = {    
            client_token: awsConfig.client_token,
            client_id: awsConfig.client_id,
            client_prefix: 'gomes!',
            mongodb_url: awsConfig.mongodb_url,
            developers: ['906552238619639878'],
            sharding: false,
            database: true,
            brapi_token: awsConfig.brapi_token,
            lolEsportsApiKey: awsConfig.lolEsportsApiKey,
            groq_api_key: awsConfig.groq_api_key,
            lavalink_url: awsConfig.lavalink_url,
            lavalink_password: awsConfig.lavalink_password,
            pterodactyl_api_key: awsConfig.pterodactyl_api_key,
            pterodactyl_url: awsConfig.pterodactyl_url
        };

        if (!config.client_id) {
            console.error("AVISO: client_id não encontrado na configuração!");
        }
        if (!config.client_token) {
            console.error("AVISO: client_token não encontrado na configuração!");
        }
        if (!config.pterodactyl_api_key) {
            console.error("AVISO: pterodactyl_api_key não encontrado na configuração!");
        }
        if (!config.pterodactyl_url) {
            console.error("AVISO: pterodactyl_url não encontrado na configuração!");
        }

        return config;
    } catch (error) {
        console.error("Erro ao carregar as configurações do AWS Parameter Store:", error);
        throw error;
    }
}

module.exports = { loadConfig };
