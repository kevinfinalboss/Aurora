const { Client, CommandInteraction, ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");
const axios = require("axios");
const config = require("../../configuration/index");
const { SUPPORTED_FIIS } = require("../../configuration/quotes.json");

module.exports = {
    name: "fii",
    description: "Obter informações sobre um Fundo de Investimento Imobiliário (FII)",
    options: [
        {
            name: "fundo",
            description: "Escolha o FII para ver as informações",
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: SUPPORTED_FIIS.map(fii => ({ name: fii.name, value: fii.value }))
        }
    ],

    /**
     * 
     * @param {Client} client 
     * @param {CommandInteraction} interaction 
     */

    run: async (client, interaction) => {
        await interaction.deferReply();

        const selectedFII = interaction.options.getString("fundo");

        try {
            const response = await axios.get(`https://brapi.dev/api/quote/${selectedFII}?fundamental=true`, {
                headers: {
                    'Authorization': `Bearer ${config.brapi_token}`
                }
            });
            
            if (!response.data || !response.data.results || response.data.results.length === 0) {
                throw new Error("Dados incompletos recebidos da API");
            }

            const fiiData = response.data.results[0];
            const fiiInfo = SUPPORTED_FIIS.find(f => f.value === selectedFII);

            // Formatação robusta da data
            let formattedDate = "Data não disponível";
            if (fiiData.updatedAt) {
                const updatedDate = new Date(fiiData.updatedAt);
                if (!isNaN(updatedDate.getTime())) {
                    formattedDate = updatedDate.toLocaleString('pt-BR', { 
                        timeZone: 'America/Sao_Paulo',
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    });
                } else {
                    console.log("Data inválida recebida da API:", fiiData.updatedAt);
                    formattedDate = new Date().toLocaleString('pt-BR', { 
                        timeZone: 'America/Sao_Paulo',
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    });
                    formattedDate += " (data atual)";
                }
            }

            const embed = new EmbedBuilder()
                .setTitle(`📊 Informações: ${fiiData.longName || fiiInfo.name}`)
                .setColor(fiiData.change >= 0 ? "#00FF00" : "#FF0000")
                .setThumbnail(fiiData.logourl || "https://i.imgur.com/8dTMXLO.png")
                .setTimestamp()
                .setFooter({ 
                    text: "Dados fornecidos por Brapi", 
                    iconURL: "https://brapi.dev/favicon.svg" 
                });

            const addFieldIfDefined = (name, value, inline = true, formatFunction = null) => {
                if (value !== undefined && value !== null && value !== 0) {
                    const formattedValue = formatFunction ? formatFunction(value) : value.toString();
                    embed.addFields({ name, value: formattedValue, inline });
                }
            };

            const formatCurrency = (value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            const formatPercentage = (value) => `${value.toFixed(2)}%`;
            const formatLargeNumber = (value) => value.toLocaleString('pt-BR');

            addFieldIfDefined("Preço Atual", fiiData.regularMarketPrice, true, formatCurrency);
            addFieldIfDefined("Variação", fiiData.change, true, (value) => `${formatCurrency(value)} (${formatPercentage(fiiData.changePercent)})`);
            addFieldIfDefined("Abertura", fiiData.regularMarketOpen, true, formatCurrency);
            addFieldIfDefined("Máxima do Dia", fiiData.regularMarketDayHigh, true, formatCurrency);
            addFieldIfDefined("Mínima do Dia", fiiData.regularMarketDayLow, true, formatCurrency);
            addFieldIfDefined("Volume", fiiData.regularMarketVolume, true, formatLargeNumber);
            addFieldIfDefined("Valor de Mercado", fiiData.marketCap, false, (value) => `${formatCurrency(value / 1000000)} M`);
            addFieldIfDefined("P/VP", fiiData.priceToBook, true, (value) => value.toFixed(2));
            addFieldIfDefined("Dividend Yield", fiiData.dividendYield, true, formatPercentage);
            addFieldIfDefined("Último Rendimento", fiiData.lastDividend, true, formatCurrency);

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("Erro ao obter informações do FII:", error.response ? error.response.data : error.message);
            await interaction.editReply("Desculpe, ocorreu um erro ao obter as informações do FII. Os dados podem estar temporariamente indisponíveis. Por favor, tente novamente mais tarde.");
        }
    }
};