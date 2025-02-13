// structures/events/client/leagueInteractions.js
const { Events, EmbedBuilder, InteractionType } = require('discord.js');
const RiotAPI = require('../../functions/riot/riotApi');
const DataDragonAPI = require('../../functions/riot/ddragonApi');

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction) {
        // Verifica se é uma interação de componente (botão)
        if (interaction.type !== InteractionType.MessageComponent) return;

        // Verificar se é um botão relacionado ao LoL
        const [action, puuid, region] = interaction.customId.split('_');
        if (!['maestria', 'rank'].includes(action)) return;

        await interaction.deferUpdate();

        try {
            if (action === 'maestria') {
                const masteries = await RiotAPI.getChampionMasteries(puuid, region);
                const embed = new EmbedBuilder()
                    .setTitle('Maestrias de Campeão')
                    .setColor("#9B59B6");

                const detailedMasteries = await Promise.all(
                    masteries.slice(0, 10).map(async (mastery, index) => {
                        const champion = await DataDragonAPI.getChampionInfo(mastery.championId);
                        const lastPlayed = new Date(mastery.lastPlayTime).toLocaleDateString('pt-BR');
                        return `${index + 1}. **${champion?.name || 'Desconhecido'}**\n` +
                               `⭐ Nível ${mastery.championLevel}\n` +
                               `📊 ${mastery.championPoints.toLocaleString()} pontos\n` +
                               `🕒 Último jogo: ${lastPlayed}`;
                    })
                );

                embed.setDescription(detailedMasteries.join('\n\n'));
                
                await interaction.followUp({ 
                    embeds: [embed],
                    ephemeral: true 
                });
            }
            else if (action === 'rank') {
                const summoner = await RiotAPI.getSummonerByPuuid(puuid, region);
                const ranks = await RiotAPI.getRankedStats(summoner.id, region);
                
                const embed = new EmbedBuilder()
                    .setTitle('Ranks')
                    .setColor("#F1C40F");

                if (ranks.length > 0) {
                    const tiers = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
                    
                    ranks.forEach(rank => {
                        const winRate = ((rank.wins / (rank.wins + rank.losses)) * 100).toFixed(1);
                        const queueName = rank.queueType === 'RANKED_SOLO_5x5' ? 'Solo/Duo' : 'Flex';
                        const totalGames = rank.wins + rank.losses;
                        
                        embed.addFields({
                            name: `Ranked ${queueName}`,
                            value: `**${rank.tier} ${rank.rank}** (${rank.leaguePoints} LP)\n` +
                                   `📊 Vitórias: ${rank.wins} | Derrotas: ${rank.losses}\n` +
                                   `🎮 Total de Jogos: ${totalGames}\n` +
                                   `📈 Taxa de Vitória: ${winRate}%`,
                            inline: false
                        });
                    });

                    const highestRank = ranks.reduce((prev, current) => {
                        const prevIndex = tiers.indexOf(prev.tier);
                        const currIndex = tiers.indexOf(current.tier);
                        return currIndex > prevIndex ? current : prev;
                    });

                    embed.setThumbnail(DataDragonAPI.getRankEmblemUrl(highestRank.tier));
                } else {
                    embed.setDescription('Este jogador não possui ranks nas filas ranqueadas.')
                        .setThumbnail(DataDragonAPI.getRankEmblemUrl('UNRANKED'));
                }

                await interaction.followUp({ 
                    embeds: [embed],
                    ephemeral: true 
                });
            }
        } catch (error) {
            console.error('Erro ao processar interação de LoL:', error);
            
            try {
                const errorMessage = error.response?.status === 404 ? 
                    'Jogador não encontrado.' : 
                    'Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.';

                await interaction.followUp({ 
                    content: errorMessage,
                    ephemeral: true 
                });
            } catch (followUpError) {
                console.error('Erro ao enviar mensagem de erro:', followUpError);
            }
        }
    }
};