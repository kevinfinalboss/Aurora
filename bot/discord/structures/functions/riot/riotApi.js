const axios = require('axios');

const RIOT_API_KEY = process.env.RIOT_API_KEY;

const REGION_TO_ROUTING = {
    'br1': 'americas',
    'na1': 'americas',
    'euw1': 'europe',
    'eun1': 'europe',
    'kr': 'asia',
    'jp1': 'asia',
    'oc1': 'sea'
};

class RiotAPI {
    static async getAccountByRiotId(gameName, tagLine, region) {
        try {
            const routing = REGION_TO_ROUTING[region];
            const response = await axios.get(
                `https://${routing}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
                { headers: { "X-Riot-Token": RIOT_API_KEY } }
            );
            return response.data;
        } catch (error) {
            console.error(`Erro ao buscar conta Riot:`, error.message);
            throw error;
        }
    }

    static async getChampionMasteries(puuid, region) {
        try {
            const response = await axios.get(
                `https://${region}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top`,
                { headers: { "X-Riot-Token": RIOT_API_KEY } }
            );
            return response.data;
        } catch (error) {
            console.error(`Erro ao buscar maestrias:`, error.message);
            throw error;
        }
    }

    static async getSummonerByPuuid(puuid, region) {
        try {
            const response = await axios.get(
                `https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`,
                { headers: { "X-Riot-Token": RIOT_API_KEY } }
            );
            return response.data;
        } catch (error) {
            console.error(`Erro ao buscar invocador:`, error.message);
            throw error;
        }
    }

    static async getRankedStats(summonerId, region) {
        try {
            const response = await axios.get(
                `https://${region}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`,
                { headers: { "X-Riot-Token": RIOT_API_KEY } }
            );
            return response.data;
        } catch (error) {
            console.error(`Erro ao buscar ranks:`, error.message);
            throw error;
        }
    }
}

module.exports = RiotAPI;