const { Client, CommandInteraction, ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");
const axios = require("axios");

const SUPPORTED_FIIS = [
    { name: "KNRI11 - Kinea Renda Imobiliária", value: "KNRI11.SA" },
    { name: "HGLG11 - CSHG Logística", value: "HGLG11.SA" },
    { name: "MXRF11 - Maxi Renda", value: "MXRF11.SA" },
    { name: "BCFF11 - BTG Pactual Fundo de Fundos", value: "BCFF11.SA" },
    { name: "XPLG11 - XP Log", value: "XPLG11.SA" },
    { name: "XPML11 - XP Malls", value: "XPML11.SA" },
    { name: "VISC11 - Vinci Shopping Centers", value: "VISC11.SA" },
    { name: "HGRE11 - CSHG Real Estate", value: "HGRE11.SA" },
    { name: "GGRC11 - GGR Covepi Renda", value: "GGRC11.SA" },
    { name: "VILG11 - Vinci Logística", value: "VILG11.SA" },
];

module.exports = {
    name: "fundos",
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
            const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${selectedFII}?interval=1d`);
            
            const result = response.data.chart.result[0];
            if (!result || !result.meta) {
                throw new Error("Dados incompletos recebidos da API");
            }

            const {
                regularMarketPrice,
                regularMarketChange,
                regularMarketChangePercent,
                regularMarketDayHigh,
                regularMarketDayLow,
                regularMarketVolume,
                regularMarketPreviousClose,
            } = result.meta;

            const fiiInfo = SUPPORTED_FIIS.find(f => f.value === selectedFII);

            const embed = new EmbedBuilder()
                .setTitle(`📊 Informações: ${fiiInfo.name}`)
                .setDescription(`Dados atualizados em: ${new Date().toLocaleString('pt-BR')}`)
                .setColor("#0099ff")
                .setThumbnail("https://i.imgur.com/8dTMXLO.png")
                .setTimestamp()
                .setFooter({ 
                    text: "Dados fornecidos por Yahoo Finance", 
                    iconURL: "https://s.yimg.com/cv/apiv2/default/20180926/logo_finance_192px.png" 
                });

            const addFieldIfDefined = (name, value, inline = true) => {
                if (value !== undefined && value !== null) {
                    embed.addFields({ name, value: value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), inline });
                }
            };

            addFieldIfDefined("Preço Atual", regularMarketPrice);
            
            if (regularMarketChange !== undefined && regularMarketChangePercent !== undefined) {
                const changeValue = `${regularMarketChange.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${regularMarketChangePercent.toFixed(2)}%)`;
                embed.addFields({ name: "Variação", value: changeValue, inline: true });
                embed.setColor(regularMarketChange >= 0 ? "#00FF00" : "#FF0000");
            }

            addFieldIfDefined("Abertura", regularMarketPreviousClose);
            addFieldIfDefined("Máxima do Dia", regularMarketDayHigh);
            addFieldIfDefined("Mínima do Dia", regularMarketDayLow);

            if (regularMarketVolume !== undefined) {
                embed.addFields({ name: "Volume", value: regularMarketVolume.toLocaleString('pt-BR'), inline: true });
            }

            try {
                const quoteResponse = await axios.get(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${selectedFII}?modules=summaryDetail,price`);
                const { summaryDetail, price } = quoteResponse.data.quoteSummary.result[0];

                if (summaryDetail.dividendYield && summaryDetail.dividendYield.raw) {
                    embed.addFields({ name: "Dividend Yield", value: `${(summaryDetail.dividendYield.raw * 100).toFixed(2)}%`, inline: true });
                }
                if (summaryDetail.marketCap && summaryDetail.marketCap.raw) {
                    embed.addFields({ name: "Valor de Mercado", value: `R$ ${(summaryDetail.marketCap.raw / 1000000).toFixed(2)} M`, inline: true });
                }
                if (price.longName) {
                    embed.setTitle(`📊 Informações: ${price.longName} (${selectedFII.replace('.SA', '')})`);
                }
            } catch (error) {
                console.error("Erro ao obter informações adicionais:", error);
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("Erro ao obter informações do FII:", error);
            await interaction.editReply("Desculpe, ocorreu um erro ao obter as informações do FII. Os dados podem estar temporariamente indisponíveis. Por favor, tente novamente mais tarde.");
        }
    }
};