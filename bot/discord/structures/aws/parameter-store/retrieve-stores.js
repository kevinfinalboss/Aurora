const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");

const client = new SSMClient({ region: "us-east-1" });

async function getConfigValues() {
    const params = {
        client_token: "/keys/bot/discord/token",
        client_id: "/keys/bot/aurora/discord/clientid/token",
        mongodb_url: "/keys/bot/aurora/mongodb/connect",
        brapi_token: "/keys/bot/aurora/discord/brapi/apikey",
        lolEsportsApiKey: "/keys/bot/aurora/discord/lolesports/apikey"
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
        } catch (error) {
            console.error(`Erro ao recuperar ${param}: ${error.message}`);
        }
    }

    return config;
}

module.exports = { getConfigValues };
