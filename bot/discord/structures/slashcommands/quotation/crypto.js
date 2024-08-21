const { Client, CommandInteraction, ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");
const axios = require("axios");

const SUPPORTED_CRYPTOCURRENCIES = [
    { name: "Bitcoin", value: "bitcoin", symbol: "BTC", icon: "₿" },
    { name: "Ethereum", value: "ethereum", symbol: "ETH", icon: "Ξ" },
    { name: "Binance Coin", value: "binancecoin", symbol: "BNB", icon: "BNB" },
    { name: "Cardano", value: "cardano", symbol: "ADA", icon: "ADA" },
    { name: "Solana", value: "solana", symbol: "SOL", icon: "◎" },
    { name: "Ripple", value: "ripple", symbol: "XRP", icon: "XRP" },
    { name: "Polkadot", value: "polkadot", symbol: "DOT", icon: "DOT" },
    { name: "Dogecoin", value: "dogecoin", symbol: "DOGE", icon: "Ð" },
    { name: "Avalanche", value: "avalanche-2", symbol: "AVAX", icon: "AVAX" },
    { name: "Chainlink", value: "chainlink", symbol: "LINK", icon: "LINK" },
];

module.exports = {
    name: "crypto",
    description: "Obter a cotação atual de uma criptomoeda em relação ao Real (BRL) e Dólar (USD)",
    options: [
        {
            name: "moeda",
            description: "Escolha a criptomoeda para ver a cotação",
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: SUPPORTED_CRYPTOCURRENCIES.map(crypto => ({ name: `${crypto.icon} ${crypto.name}`, value: crypto.value }))
        }
    ],

    /**
     * 
     * @param {Client} client 
     * @param {CommandInteraction} interaction 
     */

    run: async (client, interaction) => {
        await interaction.deferReply();

        const selectedCrypto = interaction.options.getString("moeda");

        try {
            const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${selectedCrypto}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`);

            const { 
                name, symbol, image,
                market_data: { 
                    current_price, price_change_percentage_24h,
                    high_24h, low_24h, 
                    market_cap, total_volume,
                    circulating_supply, total_supply
                }
            } = response.data;

            const cryptoInfo = SUPPORTED_CRYPTOCURRENCIES.find(c => c.value === selectedCrypto);

            const embed = new EmbedBuilder()
                .setTitle(`${cryptoInfo.icon} Cotação: ${name} (${symbol.toUpperCase()})`)
                .setDescription(`Dados atualizados em: ${new Date().toLocaleString('pt-BR')}`)
                .addFields(
                    { name: "Preço (BRL)", value: `R$ ${current_price.brl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, inline: true },
                    { name: "Preço (USD)", value: `$ ${current_price.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, inline: true },
                    { name: "Variação 24h", value: `${price_change_percentage_24h.toFixed(2)}%`, inline: true },
                    { name: "Máxima 24h (BRL)", value: `R$ ${high_24h.brl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, inline: true },
                    { name: "Mínima 24h (BRL)", value: `R$ ${low_24h.brl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, inline: true },
                    { name: "Volume 24h (BRL)", value: `R$ ${total_volume.brl.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, inline: true },
                    { name: "Cap. de Mercado (BRL)", value: `R$ ${market_cap.brl.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, inline: true },
                    { name: "Fornecimento Circulante", value: `${circulating_supply.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} ${symbol.toUpperCase()}`, inline: true },
                    { name: "Fornecimento Total", value: total_supply ? `${total_supply.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} ${symbol.toUpperCase()}` : "Não disponível", inline: true },
                )
                .setColor("#F7931A") 
                .setThumbnail(image.large)
                .setTimestamp()
                .setFooter({ 
                    text: "Dados fornecidos por CoinGecko", 
                    iconURL: "https://static.coingecko.com/s/coingecko-logo-8903d34ce19ca4be1c81f0db30e924154750d208683fad7ae6f2ce06c76d0a56.png" 
                });

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("Erro ao obter cotação da criptomoeda:", error);
            await interaction.editReply("Desculpe, ocorreu um erro ao obter a cotação da criptomoeda. Por favor, tente novamente mais tarde.");
        }
    }
};