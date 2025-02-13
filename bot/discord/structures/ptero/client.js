const axios = require('axios');
const { loadConfig } = require('../../structures/configuration/index');

class PteroClient {
    constructor(config) {
        this.apiKey = config.pterodactyl_api_key;
        this.baseUrl = config.pterodactyl_url;
        this.client = axios.create({
            baseURL: `${this.baseUrl}/api/client/`,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
    }

    async sendRequest(method, endpoint, data = null) {
        try {
            const response = await this.client.request({
                method,
                url: endpoint,
                data
            });
            return response.data;
        } catch (error) {
            console.error(`Erro na requisição ${method} ${endpoint}:`, error.response?.data || error.message);
            throw error;
        }
    }

    async listServers() {
        return this.sendRequest('GET', '');
    }

    async sendPowerAction(serverID, action) {
        return this.sendRequest('POST', `servers/${serverID}/power`, { signal: action });
    }
}

let pteroClientInstance;

async function getPteroClient() {
    if (!pteroClientInstance) {
        const config = await loadConfig();
        pteroClientInstance = new PteroClient(config);
    }
    return pteroClientInstance;
}

module.exports = { getPteroClient };
