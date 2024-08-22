require('dotenv').config();

const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");

const client = new SSMClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID, 
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY 
    }
});

async function getConfigValues() {
    const params = {
        client_token: "/keys/bot/discord/token",
        client_id: "/keys/bot/aurora/discord/clientid/token",
        mongodb_url: "/keys/bot/aurora/mongodb/connect",
        brapi_token: "/keys/bot/aurora/discord/brapi/apikey",
        lolEsportsApiKey: "/keys/bot/aurora/discord/lolesports/apikey",
        groq_api_key: "/keys/bot/aurora/discord/groq/apikey", 
        lavalink_url: "/keys/bot/aurora/lavalink/url",
        lavalink_password: "/keys/bot/aurora/lavalink/password"
    };

    const config = {};

    for (const [key, param] of Object.entries(params)) {
        try {            
            const command = new GetParameterCommand({
                Name: param,
                WithDecryption: true
            });

            const response = await client.send(command);
            config[key] = response.Parameter.Value;

            console.log(`Parâmetro SSM '${param}' recuperado com sucesso.`);
        } catch (error) {
            console.error(`Erro ao recuperar o parâmetro '${param}': ${error.message}`);
        }
    }

    return config;
}

module.exports = { getConfigValues };
