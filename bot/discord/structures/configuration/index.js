const { getConfigValues } = require("../aws/parameter-store/retrieve-stores");

async function loadConfig() {
    try {
        const awsConfig = await getConfigValues();

        console.log("Valor de mongodb_url recebido:", awsConfig.mongodb_url);

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
        };


        if (!config.client_id) {
            console.error("AVISO: client_id não encontrado na configuração!");
        }
        if (!config.client_token) {
            console.error("AVISO: client_token não encontrado na configuração!");
        }

        return config;
    } catch (error) {
        console.error("Erro ao carregar as configurações do AWS Parameter Store:", error);
        throw error;
    }
}

module.exports = { loadConfig };
