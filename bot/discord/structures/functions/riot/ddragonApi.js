// structures/functions/riot/ddragonApi.js
const axios = require('axios');

class DataDragonAPI {
    static version = '14.22.1';
    static language = 'pt_BR';

    static async getLatestVersion() {
        try {
            const response = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json');
            this.version = response.data[0];
            return this.version;
        } catch (error) {
            console.error('Erro ao buscar versão do Data Dragon:', error.message);
            throw error;
        }
    }

    static async getChampionInfo(championId) {
        try {
            const response = await axios.get(
                `http://ddragon.leagueoflegends.com/cdn/${this.version}/data/${this.language}/champion.json`
            );
            const champions = response.data.data;
            return Object.values(champions).find(champion => champion.key === championId.toString());
        } catch (error) {
            console.error('Erro ao buscar informações do campeão:', error.message);
            return null;
        }
    }

    static getProfileIconUrl(iconId) {
        return `http://ddragon.leagueoflegends.com/cdn/${this.version}/img/profileicon/${iconId}.png`;
    }

    static getChampionSquareUrl(championId) {
        return `http://ddragon.leagueoflegends.com/cdn/${this.version}/img/champion/${championId}.png`;
    }

    static getRankEmblemUrl(tier) {
        return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/${tier.toLowerCase()}.png`;
    }
}

module.exports = DataDragonAPI;