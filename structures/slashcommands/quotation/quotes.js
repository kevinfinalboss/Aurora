const { Client, CommandInteraction, ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");
const axios = require("axios");
const config = require("../../config"); // Ajuste o caminho conforme necessário

// Lista de fundos imobiliários suportados
const SUPPORTED_FIIS = [
    { name: "KNRI11 - Kinea Renda Imobiliária", value: "KNRI11" },
    { name: "HGLG11 - CSHG Logística", value: "HGLG11" },
    { name: "MXRF11 - Maxi Renda", value: "MXRF11" },
    { name: "BCFF11 - BTG Pactual Fundo de Fundos", value: "BCFF11" },
    { name: "XPLG11 - XP Log", value: "XPLG11" },
    { name: "XPML11 - XP Malls", value: "XPML11" },
    { name: "VISC11 - Vinci Shopping Centers", value: "VISC11" },
    { name: "HGRE11 - CSHG Real Estate", value: "HGRE11" },
    { name: "GGRC11 - GGR Covepi Renda", value: "GGRC11" },
    { name: "VILG11 - Vinci Logística", value: "VILG11" },
];

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
            const response = await axios.get(`https://brapi.dev/api/quote/${selectedFII}?fundamental=true&token=${config.brapi_token}`);
            
            if (!response.data || !response.data.results || response.data.results.length === 0) {
                throw new Error("Dados incompletos recebidos da API");
            }

            const fiiData = response.data.results[0];
            const fiiInfo = SUPPORTED_FIIS.find(f => f.value === selectedFII);

            const embed = new EmbedBuilder()
                .setTitle(`📊 Informações: ${fiiInfo.name}`)
                .setDescription(`Dados atualizados em: ${new Date(fiiData.updatedAt).toLocaleString('pt-BR')}`)
                .setColor(fiiData.change >= 0 ? "#00FF00" : "#FF0000")
                .setThumbnail(fiiData.logourl || "https://i.imgur.com/8dTMXLO.png")
                .setTimestamp()
                .setFooter({ 
                    text: "Dados fornecidos por Brapi", 
                    iconURL: "https://brapi.dev/favicon.svg" 
                });

            // Função auxiliar para adicionar campos com verificação e formatação
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

            if (fiiData.longName) {
                embed.setTitle(`📊 Informações: ${fiiData.longName} (${selectedFII})`);
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("Erro ao obter informações do FII:", error);
            await interaction.editReply("Desculpe, ocorreu um erro ao obter as informações do FII. Os dados podem estar temporariamente indisponíveis. Por favor, tente novamente mais tarde.");
        }
    }
};