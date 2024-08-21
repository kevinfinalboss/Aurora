const { Client, CommandInteraction, ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");
const axios = require("axios");
const config = require("../../configuration/index");
const { STOCKS } = require("../../configuration/quotes.json");

module.exports = {
    name: "acao",
    description: "Obter informações sobre uma ação",
    options: [
        {
            name: "codigo",
            description: "Escolha a ação para ver as informações",
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: STOCKS.map(stock => ({ name: stock.name, value: stock.value }))
        },
        {
            name: "range",
            description: "Intervalo de tempo para os dados históricos",
            type: ApplicationCommandOptionType.String,
            required: false,
            choices: [
                { name: "1 dia", value: "1d" },
                { name: "5 dias", value: "5d" },
                { name: "1 mês", value: "1mo" },
                { name: "3 meses", value: "3mo" },
                { name: "6 meses", value: "6mo" },
                { name: "1 ano", value: "1y" },
                { name: "2 anos", value: "2y" },
                { name: "5 anos", value: "5y" },
                { name: "10 anos", value: "10y" },
                { name: "Ano atual", value: "ytd" },
                { name: "Máximo", value: "max" }
            ]
        },
        {
            name: "interval",
            description: "Intervalo entre os dados históricos",
            type: ApplicationCommandOptionType.String,
            required: false,
            choices: [
                { name: "1 minuto", value: "1m" },
                { name: "5 minutos", value: "5m" },
                { name: "15 minutos", value: "15m" },
                { name: "30 minutos", value: "30m" },
                { name: "1 hora", value: "1h" },
                { name: "1 dia", value: "1d" },
                { name: "1 semana", value: "1wk" },
                { name: "1 mês", value: "1mo" }
            ]
        },
        {
            name: "fundamental",
            description: "Incluir dados fundamentais",
            type: ApplicationCommandOptionType.Boolean,
            required: false
        },
        {
            name: "dividendos",
            description: "Incluir dados de dividendos",
            type: ApplicationCommandOptionType.Boolean,
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

        const selectedStock = interaction.options.getString("codigo");
        const range = interaction.options.getString("range") || "1mo";
        const interval = interaction.options.getString("interval") || "1d";
        const fundamental = interaction.options.getBoolean("fundamental") || false;
        const dividendos = interaction.options.getBoolean("dividendos") || false;

        try {
            const response = await axios.get(`https://brapi.dev/api/quote/${selectedStock}?range=${range}&interval=${interval}&fundamental=${fundamental}&dividends=${dividendos}`, {
                headers: {
                    'Authorization': `Bearer ${config.brapi_token}`
                }
            });
            
            if (!response.data || !response.data.results || response.data.results.length === 0) {
                throw new Error("Dados incompletos recebidos da API");
            }

            const stockData = response.data.results[0];
            const stockInfo = STOCKS.find(s => s.value === selectedStock);

            const embed = new EmbedBuilder()
                .setTitle(`📊 Informações: ${stockData.longName || stockInfo.name}`)
                .setColor(stockData.regularMarketChange >= 0 ? "#00FF00" : "#FF0000")
                .setThumbnail(stockData.logourl || "https://i.imgur.com/8dTMXLO.png")
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

            addFieldIfDefined("Preço Atual", stockData.regularMarketPrice, true, formatCurrency);
            addFieldIfDefined("Variação", stockData.regularMarketChange, true, (value) => `${formatCurrency(value)} (${formatPercentage(stockData.regularMarketChangePercent)})`);
            addFieldIfDefined("Abertura", stockData.regularMarketOpen, true, formatCurrency);
            addFieldIfDefined("Máxima do Dia", stockData.regularMarketDayHigh, true, formatCurrency);
            addFieldIfDefined("Mínima do Dia", stockData.regularMarketDayLow, true, formatCurrency);
            addFieldIfDefined("Volume", stockData.regularMarketVolume, true, formatLargeNumber);
            addFieldIfDefined("Valor de Mercado", stockData.marketCap, false, (value) => `${formatCurrency(value / 1000000)} M`);

            if (fundamental) {
                addFieldIfDefined("P/L", stockData.priceEarnings, true, (value) => value.toFixed(2));
                addFieldIfDefined("P/VP", stockData.priceToBook, true, (value) => value.toFixed(2));
                addFieldIfDefined("Dividend Yield", stockData.dividendYield, true, formatPercentage);
                addFieldIfDefined("LPA", stockData.earningsPerShare, true, formatCurrency);
            }

            if (dividendos && stockData.dividendsData && stockData.dividendsData.cashDividends) {
                const lastDividend = stockData.dividendsData.cashDividends[0];
                if (lastDividend) {
                    addFieldIfDefined("Último Dividendo", lastDividend.rate, false, formatCurrency);
                    addFieldIfDefined("Data do Último Dividendo", new Date(lastDividend.paymentDate).toLocaleDateString('pt-BR'), false);
                }
            }

            if (stockData.historicalDataPrice && stockData.historicalDataPrice.length > 0) {
                const lastHistoricalData = stockData.historicalDataPrice[stockData.historicalDataPrice.length - 1];
                const firstHistoricalData = stockData.historicalDataPrice[0];
                const totalChange = ((lastHistoricalData.close - firstHistoricalData.open) / firstHistoricalData.open) * 100;

                embed.addFields({ 
                    name: `Variação no Período (${range})`, 
                    value: `${formatPercentage(totalChange)}`, 
                    inline: false 
                });
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("Erro ao obter informações da ação:", error.response ? error.response.data : error.message);
            await interaction.editReply("Desculpe, ocorreu um erro ao obter as informações da ação. Os dados podem estar temporariamente indisponíveis. Por favor, tente novamente mais tarde.");
        }
    }
};