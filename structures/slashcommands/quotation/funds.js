const { Client, CommandInteraction, ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");
const axios = require("axios");

// Lista de fundos imobiliários suportados
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
            const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${selectedFII}?interval=1d`);
            
            const {
                regularMarketPrice,
                regularMarketChange,
                regularMarketChangePercent,
                regularMarketDayHigh,
                regularMarketDayLow,
                regularMarketVolume,
                regularMarketPreviousClose,
            } = response.data.chart.result[0].meta;

            const fiiInfo = SUPPORTED_FIIS.find(f => f.value === selectedFII);

            const embed = new EmbedBuilder()
                .setTitle(`📊 Informações: ${fiiInfo.name}`)
                .setDescription(`Dados atualizados em: ${new Date().toLocaleString('pt-BR')}`)
                .addFields(
                    { name: "Preço Atual", value: `R$ ${regularMarketPrice.toFixed(2)}`, inline: true },
                    { name: "Variação", value: `R$ ${regularMarketChange.toFixed(2)} (${regularMarketChangePercent.toFixed(2)}%)`, inline: true },
                    { name: "Abertura", value: `R$ ${regularMarketPreviousClose.toFixed(2)}`, inline: true },
                    { name: "Máxima do Dia", value: `R$ ${regularMarketDayHigh.toFixed(2)}`, inline: true },
                    { name: "Mínima do Dia", value: `R$ ${regularMarketDayLow.toFixed(2)}`, inline: true },
                    { name: "Volume", value: regularMarketVolume.toLocaleString('pt-BR'), inline: true },
                )
                .setColor(regularMarketChange >= 0 ? "#00FF00" : "#FF0000")
                .setThumbnail("https://i.imgur.com/8dTMXLO.png")
                .setTimestamp()
                .setFooter({ 
                    text: "Dados fornecidos por Yahoo Finance", 
                    iconURL: "https://s.yimg.com/cv/apiv2/default/20180926/logo_finance_192px.png" 
                });

            try {
                const quoteResponse = await axios.get(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${selectedFII}?modules=summaryDetail,price`);
                const { summaryDetail, price } = quoteResponse.data.quoteSummary.result[0];

                if (summaryDetail.dividendYield) {
                    embed.addFields({ name: "Dividend Yield", value: `${(summaryDetail.dividendYield.raw * 100).toFixed(2)}%`, inline: true });
                }
                if (summaryDetail.marketCap) {
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
            await interaction.editReply("Desculpe, ocorreu um erro ao obter as informações do FII. Por favor, tente novamente mais tarde.");
        }
    }
};