const { Client, CommandInteraction, EmbedBuilder } = require("discord.js");
const axios = require('axios');

module.exports = {
    name: "vlrteams",
    description: "Obter informações sobre times de Valorant",

    /**
     * 
     * @param {Client} client 
     * @param {CommandInteraction} interaction 
     */

    run: async (client, interaction) => {
        const region = interaction.options.getString('region') || 'all';
        const page = interaction.options.getInteger('page') || 1;
        const limit = interaction.options.getInteger('limit') || 10;

        await interaction.deferReply();

        try {
            const response = await axios.get(`https://vlr.orlandomm.net/api/v1/teams`, {
                params: { region, page, limit }
            });

            const { data, pagination } = response.data;

            if (data.length === 0) {
                await interaction.editReply('Nenhum time encontrado para esta região.');
                return;
            }

            let cor;
            switch (region) {
                case 'na': cor = '#FF0000'; break;
                case 'eu': cor = '#0000FF'; break;
                case 'br': cor = '#00FF00'; break;
                case 'ap': cor = '#FFFF00'; break;
                default: cor = '#800080'; break;
            }

            const embed = new EmbedBuilder()
                .setColor(cor)
                .setTitle(`Times de Valorant - ${region.toUpperCase()}`)
                .setDescription(`Página ${pagination.page} de ${pagination.totalPages}`)
                .setFooter({ text: `Total de times: ${pagination.totalElements}` })
                .setTimestamp();

            data.forEach((team, index) => {
                embed.addFields({ 
                    name: `${index + 1}. ${team.name}`, 
                    value: `[Ver perfil](${team.url}) | País: ${team.country || 'N/A'}`,
                    inline: true 
                });
            });

            if (pagination.hasNextPage) {
                embed.addFields({ 
                    name: '\u200B', 
                    value: 'Use o comando novamente com uma página diferente para ver mais times.' 
                });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Erro ao buscar dados da API:', error);
            await interaction.editReply({
                content: 'Ocorreu um erro ao buscar as informações dos times. Por favor, tente novamente mais tarde.',
                ephemeral: true
            });
        }
    },

    options: [
        {
            name: 'region',
            description: 'Região dos times',
            type: 3,
            required: true,
            choices: [
                { name: 'Todas', value: 'all' },
                { name: 'América do Norte', value: 'na' },
                { name: 'Europa', value: 'eu' },
                { name: 'Brasil', value: 'br' },
                { name: 'Ásia-Pacífico', value: 'ap' },
                { name: 'Coreia', value: 'kr' },
                { name: 'China', value: 'ch' },
                { name: 'Japão', value: 'jp' },
                { name: 'América Latina Norte', value: 'lan' },
                { name: 'América Latina Sul', value: 'las' },
                { name: 'Oceania', value: 'oce' },
                { name: 'MENA', value: 'mn' },
                { name: 'Game Changers', value: 'gc' }
            ]
        },
        {
            name: 'page',
            description: 'Número da página',
            type: 4,
            required: false
        },
        {
            name: 'limit',
            description: 'Limite de resultados por página',
            type: 4,
            required: false
        }
    ]
};