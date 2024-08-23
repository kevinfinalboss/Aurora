const { ApplicationCommandOptionType, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
const axios = require("axios");

const SUPPORTED_CURRENCIES = [
    { name: "Real Brasileiro", value: "BRL", flag: "🇧🇷" },
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
    name: "converter",
    description: "Converter um valor entre duas moedas",
    options: [
        {
            name: "de",
            description: "Moeda de origem",
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true
        },
        {
            name: "para",
            description: "Moeda de destino",
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true
        }
    ],

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const choices = SUPPORTED_CURRENCIES.filter(currency => 
            currency.name.toLowerCase().includes(focusedValue) || 
            currency.value.toLowerCase().includes(focusedValue)
        );
        await interaction.respond(
            choices.map(choice => ({ name: `${choice.flag} ${choice.name}`, value: choice.value }))
        );
    },

    async run(client, interaction) {
        const fromCurrency = interaction.options.getString("de");
        const toCurrency = interaction.options.getString("para");

        const modal = new ModalBuilder()
            .setCustomId('currencyConversionModal')
            .setTitle('Conversão de Moeda');

        const amountInput = new TextInputBuilder()
            .setCustomId('amount')
            .setLabel("Valor para converter")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Digite o valor a ser convertido')
            .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(amountInput);
        modal.addComponents(firstActionRow);

        await interaction.showModal(modal);

        const filter = (interaction) => interaction.customId === 'currencyConversionModal';
        interaction.awaitModalSubmit({ filter, time: 60000 })
            .then(async modalInteraction => {
                await modalInteraction.deferReply();
                const amount = modalInteraction.fields.getTextInputValue('amount');

                if (isNaN(amount)) {
                    return modalInteraction.editReply("Por favor, insira um valor numérico válido.");
                }

                try {
                    const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`);
                    const rates = response.data.rates;
                    const conversionRate = rates[toCurrency] / rates[fromCurrency];
                    const convertedAmount = (amount * conversionRate).toFixed(2);

                    const fromCurrencyInfo = SUPPORTED_CURRENCIES.find(c => c.value === fromCurrency);
                    const toCurrencyInfo = SUPPORTED_CURRENCIES.find(c => c.value === toCurrency);

                    const embed = new EmbedBuilder()
                        .setTitle(`${fromCurrencyInfo.flag} ${fromCurrency} para ${toCurrencyInfo.flag} ${toCurrency}`)
                        .setDescription(`Conversão de ${fromCurrencyInfo.name} para ${toCurrencyInfo.name}`)
                        .addFields(
                            { name: 'Valor Original', value: `${amount} ${fromCurrency}`, inline: true },
                            { name: 'Valor Convertido', value: `${convertedAmount} ${toCurrency}`, inline: true },
                            { name: 'Taxa de Conversão', value: `1 ${fromCurrency} = ${conversionRate.toFixed(4)} ${toCurrency}`, inline: false }
                        )
                        .setColor("#00A859")
                        .setTimestamp()
                        .setThumbnail('https://c.tenor.com/cLjA_QYEHesAAAAC/tenor.gif')
                        .setFooter({ 
                            text: "Dados fornecidos pelo Banco Central do Brasil", 
                            iconURL: client.user.displayAvatarURL()
                        });

                    await modalInteraction.editReply({ embeds: [embed] });
                } catch (error) {
                    console.error("Erro na conversão de moeda:", error);
                    await modalInteraction.editReply("Ocorreu um erro ao realizar a conversão. Por favor, tente novamente mais tarde.");
                }
            })
            .catch(err => {
                console.error("Erro ao aguardar o modal:", err);
                interaction.followUp({ content: "Tempo limite excedido ou ocorreu um erro. Por favor, tente novamente.", ephemeral: true });
            });
    }
};