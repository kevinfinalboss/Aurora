const { Client, CommandInteraction, ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");
const axios = require("axios");

const SUPPORTED_CURRENCIES = [
    { name: "Dólar Americano", value: "USD", flag: "🇺🇸" },
    { name: "Euro", value: "EUR", flag: "🇪🇺" },
    { name: "Libra Esterlina", value: "GBP", flag: "🇬🇧" },
    { name: "Iene Japonês", value: "JPY", flag: "🇯🇵" },
    { name: "Dólar Canadense", value: "CAD", flag: "🇨🇦" },
    { name: "Dólar Australiano", value: "AUD", flag: "🇦🇺" },
    { name: "Franco Suíço", value: "CHF", flag: "🇨🇭" },
    { name: "Yuan Chinês", value: "CNY", flag: "🇨🇳" },
    { name: "Peso Argentino", value: "ARS", flag: "🇦🇷" },
    { name: "Peso Mexicano", value: "MXN", flag: "🇲🇽" },
];

module.exports = {
    name: "price",
    description: "Obter a cotação atual de uma moeda em relação ao Real (BRL)",
    options: [
        {
            name: "moeda",
            description: "Escolha a moeda para ver a cotação",
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: SUPPORTED_CURRENCIES.map(currency => ({ name: `${currency.flag} ${currency.name}`, value: currency.value }))
        }
    ],

    /**
     * 
     * @param {Client} client 
     * @param {CommandInteraction} interaction 
     */

    run: async (client, interaction) => {
        await interaction.deferReply();

        const selectedCurrency = interaction.options.getString("moeda");

        try {
            const response = await axios.get(`https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaDia(moeda=@moeda,dataCotacao=@dataCotacao)?@moeda='${selectedCurrency}'&@dataCotacao='${getFormattedDate()}'&$top=1&$orderby=dataHoraCotacao%20desc&$format=json&$select=cotacaoCompra,cotacaoVenda,dataHoraCotacao`);

            if (!response.data.value || response.data.value.length === 0) {
                return interaction.editReply("Desculpe, não foi possível obter a cotação para esta moeda hoje. Pode ser um dia não útil ou a cotação ainda não foi disponibilizada.");
            }

            const { cotacaoCompra, cotacaoVenda, dataHoraCotacao } = response.data.value[0];
            const averageRate = (cotacaoCompra + cotacaoVenda) / 2;

            const currencyInfo = SUPPORTED_CURRENCIES.find(c => c.value === selectedCurrency);
            const inverseRate = 1 / averageRate;

            const embed = new EmbedBuilder()
                .setTitle(`${currencyInfo.flag} Cotação: ${currencyInfo.name} (${selectedCurrency}) / Real (BRL)`)
                .setDescription(`Dados atualizados em: ${formatDate(dataHoraCotacao)}`)
                .addFields(
                    { name: "Taxa Média", value: `1 ${selectedCurrency} = ${averageRate.toFixed(4)} BRL`, inline: false },
                    { name: "Taxa Inversa", value: `1 BRL = ${inverseRate.toFixed(4)} ${selectedCurrency}`, inline: false },
                    { name: "Compra", value: `${cotacaoCompra.toFixed(4)} BRL`, inline: true },
                    { name: "Venda", value: `${cotacaoVenda.toFixed(4)} BRL`, inline: true },
                    { name: "Variação", value: `${((cotacaoVenda - cotacaoCompra) / cotacaoCompra * 100).toFixed(2)}%`, inline: true },
                )
                .setColor("#00A859")
                .setTimestamp()
                .setThumbnail(`https://flagcdn.com/w80/${selectedCurrency.toLowerCase().slice(0, 2)}.png`)
                .setFooter({ 
                    text: "Dados fornecidos pelo Banco Central do Brasil", 
                    iconURL: "https://www.bcb.gov.br/Content/imagens/favicon.ico" 
                });

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("Erro ao obter cotação:", error);
            await interaction.editReply("Desculpe, ocorreu um erro ao obter a cotação. Por favor, tente novamente mais tarde.");
        }
    }
};

function getFormattedDate() {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const year = today.getFullYear();
    return `${month}-${day}-${year}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}