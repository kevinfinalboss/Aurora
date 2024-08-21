const { Client, CommandInteraction, EmbedBuilder, ApplicationCommandOptionType } = require("discord.js");
const axios = require('axios');

module.exports = {
    name: "vlrteaminfo",
    description: "Obter informações detalhadas sobre um time de Valorant",

    options: [
        {
            name: 'time',
            type: ApplicationCommandOptionType.String,
            description: 'Nome do time',
            required: true,
            autocomplete: true
        }
    ],

    /**
     * 
     * @param {Client} client 
     * @param {CommandInteraction} interaction 
     */
    run: async (client, interaction) => {
        const teamId = interaction.options.getString('time');

        await interaction.deferReply();

        try {
            const response = await axios.get(`https://vlr.orlandomm.net/api/v1/teams/${teamId}`);
            const teamData = response.data.data;

            if (!teamData || !teamData.info) {
                return interaction.editReply('Não foi possível encontrar informações para este time.');
            }

            const embed = new EmbedBuilder()
                .setColor('#FF4654') 
                .setTitle(teamData.info.name || 'Nome não disponível')
                .setThumbnail(teamData.info.logo || null)
                .setDescription(teamData.info.tag ? `**Tag:** ${teamData.info.tag}` : 'Tag não disponível')
                .setFooter({ text: 'Dados fornecidos por VLR.gg', iconURL: 'https://vlr.gg/img/vlr/logos/logo_header.png' })
                .setTimestamp();


            if (teamData.players && teamData.players.length > 0) {
                const playerField = teamData.players.map(player => 
                    `• [${player.name || 'Nome não disponível'}](${player.url || '#'})`
                ).join('\n');
                embed.addFields({ name: '👥 Jogadores', value: playerField || 'Nenhum jogador encontrado', inline: false });
            }

            if (teamData.staff && teamData.staff.length > 0) {
                const staffField = teamData.staff.map(staff => 
                    `• ${staff.name || 'Nome não disponível'} (${staff.tag || 'N/A'})`
                ).join('\n');
                embed.addFields({ name: '👔 Staff', value: staffField || 'Nenhum membro do staff encontrado', inline: false });
            }

            if (teamData.events && teamData.events.length > 0) {
                const eventsField = teamData.events.slice(0, 3).map(event => 
                    `• [${event.name || 'Evento sem nome'}](${event.url || '#'})\n  ${event.results && event.results[0] ? `Resultado: ${event.results[0]}` : 'Resultado não disponível'}`
                ).join('\n\n');
                embed.addFields({ name: '🏆 Eventos Recentes', value: eventsField || 'Nenhum evento recente encontrado', inline: false });
            }

            if (teamData.results && teamData.results.length > 0) {
                const resultsField = teamData.results.slice(0, 3).map(result => {
                    const team1 = result.teams && result.teams[0] ? result.teams[0] : { name: 'Time 1', points: '?' };
                    const team2 = result.teams && result.teams[1] ? result.teams[1] : { name: 'Time 2', points: '?' };
                    return `• [${team1.name} **${team1.points}** - **${team2.points}** ${team2.name}](${result.match ? result.match.url : '#'})\n  ${result.event ? result.event.name : 'Evento desconhecido'}`;
                }).join('\n\n');
                embed.addFields({ name: '📊 Resultados Recentes', value: resultsField || 'Nenhum resultado recente encontrado', inline: false });
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Erro ao buscar dados da API:', error);
            let errorMessage = 'Ocorreu um erro ao buscar as informações do time. Por favor, tente novamente mais tarde.';
            
            if (error.response) {
                console.error('Resposta de erro da API:', error.response.data);
                if (error.response.status === 404) {
                    errorMessage = 'Time não encontrado. Verifique se o nome está correto e tente novamente.';
                } else if (error.response.status === 429) {
                    errorMessage = 'Muitas requisições foram feitas. Por favor, aguarde um momento e tente novamente.';
                }
            } else if (error.request) {
                console.error('Nenhuma resposta recebida:', error.request);
                errorMessage = 'Não foi possível conectar ao servidor. Por favor, verifique sua conexão e tente novamente.';
            }

            await interaction.editReply(errorMessage);
        }
    },

    /**
     * 
     * @param {CommandInteraction} interaction 
     */
    autocomplete: async (interaction) => {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        try {
            const response = await axios.get('https://vlr.orlandomm.net/api/v1/teams', {
                params: { limit: 100, search: focusedValue }
            });

            const choices = response.data.data
                .filter(team => team && team.name && team.name.toLowerCase().includes(focusedValue))
                .map(team => ({
                    name: team.name + (team.region ? ` (${team.region.toUpperCase()})` : ''),
                    value: team.id.toString()
                }));

            const slicedChoices = choices.slice(0, 25);

            await interaction.respond(slicedChoices);
        } catch (error) {
            console.error('Erro ao buscar times para autocomplete:', error);
            if (error.response) {
                console.error('Resposta de erro da API:', error.response.data);
            }
            await interaction.respond([]);
        }
    }
};