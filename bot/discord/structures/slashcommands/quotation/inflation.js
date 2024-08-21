const { Client, CommandInteraction, ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");
const axios = require("axios");
const config = require("../../configuration/index");

const SUPPORTED_COUNTRIES = [
    { name: "Brasil", value: "brazil" },
    { name: "Estados Unidos", value: "united-states" },
    { name: "Reino Unido", value: "united-kingdom" },
    { name: "Zona do Euro", value: "euro-area" },
    { name: "Japão", value: "japan" },
];

module.exports = {
    name: "inflacao",
    description: "Obter informações sobre a inflação de um país",
    options: [
        {
            name: "pais",
            description: "Escolha o país para ver as informações de inflação",
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: SUPPORTED_COUNTRIES.map(country => ({ name: country.name, value: country.value }))
        },
        {
            name: "inicio",
            description: "Data de início (DD/MM/YYYY)",
            type: ApplicationCommandOptionType.String,
            required: false
        },
        {
            name: "fim",
            description: "Data de fim (DD/MM/YYYY)",
            type: ApplicationCommandOptionType.String,
            required: false
        }
    ],

    /**
     * 
     * @param {Client} client 
     * @param {CommandInteraction} interaction 
     */

    run: async (client, interaction) => {
        await interaction.deferReply();

        const country = interaction.options.getString("pais");
        const startDate = interaction.options.getString("inicio");
        const endDate = interaction.options.getString("fim");

        try {
            const url = new URL("https://brapi.dev/api/v2/inflation");
            url.searchParams.append("country", country);
            if (startDate) url.searchParams.append("start", startDate);
            if (endDate) url.searchParams.append("end", endDate);
            url.searchParams.append("sortBy", "date");
            url.searchParams.append("sortOrder", "desc");

            const response = await axios.get(url.toString(), {
                headers: {
                    'Authorization': `Bearer ${config.brapi_token}`
                }
            });

            if (!response.data || !response.data.inflation || response.data.inflation.length === 0) {
                throw new Error("Dados de inflação não disponíveis");
            }

            const inflationData = response.data.inflation;
            const latestData = inflationData[0];
            const countryInfo = SUPPORTED_COUNTRIES.find(c => c.value === country);

            const embed = new EmbedBuilder()
                .setTitle(`📈 Inflação: ${countryInfo.name}`)
                .setDescription(`Dados mais recentes: ${latestData.date}`)
                .setColor("#0099ff")
                .setTimestamp()
                .setFooter({ 
                    text: "Dados fornecidos por Brapi", 
                    iconURL: "https://brapi.dev/favicon.svg" 
                });

            embed.addFields({ name: "Taxa de Inflação Atual", value: `${latestData.value}%`, inline: false });

            const dataToShow = inflationData.slice(0, 5);
            dataToShow.forEach(data => {
                embed.addFields({ name: data.date, value: `${data.value}%`, inline: true });
            });

            if (inflationData.length > 5) {
                const oldestData = inflationData[inflationData.length - 1];
                embed.addFields({ 
                    name: "Comparação", 
                    value: `De ${oldestData.date} (${oldestData.value}%) a ${latestData.date} (${latestData.value}%)`,
                    inline: false 
                });
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("Erro ao obter informações de inflação:", error.response ? error.response.data : error.message);
            await interaction.editReply("Desculpe, ocorreu um erro ao obter as informações de inflação. Por favor, tente novamente mais tarde.");
        }
    }
};