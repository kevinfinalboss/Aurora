const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const cron = require('node-cron');
const guildRepository = require('../database/repository/guildRepository');
const { logger } = require('../functions/logger');

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY'];
const CURRENCY_NAMES = {
    'USD': 'Dólar Americano',
    'EUR': 'Euro',
    'GBP': 'Libra Esterlina',
    'JPY': 'Iene Japonês'
};
const CURRENCY_SYMBOLS = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥'
};

function getFormattedDate() {
    const now = new Date();
    return `${now.getMonth() + 1}-${now.getDate()}-${now.getFullYear()}`;
}

async function fetchQuotation(currency) {
    try {
        const response = await axios.get(`https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaDia(moeda=@moeda,dataCotacao=@dataCotacao)?@moeda='${currency}'&@dataCotacao='${getFormattedDate()}'&$top=1&$orderby=dataHoraCotacao%20desc&$format=json&$select=cotacaoCompra,cotacaoVenda,dataHoraCotacao`);
        
        if (response.data.value.length === 0) {
            logger(`Nenhuma cotação encontrada para ${currency}`, 'warn');
            return null;
        }

        const data = response.data.value[0];
        return {
            compra: data.cotacaoCompra,
            venda: data.cotacaoVenda,
            media: (data.cotacaoCompra + data.cotacaoVenda) / 2,
            dataHora: new Date(data.dataHoraCotacao)
        };
    } catch (error) {
        logger(`Erro ao buscar cotação para ${currency}: ${error.message}`, 'error');
        return null;
    }
}

async function fetchAllQuotations() {
    const quotations = {};
    for (const currency of CURRENCIES) {
        quotations[currency] = await fetchQuotation(currency);
    }
    return quotations;
}

function createQuotationEmbed(quotations) {
    const embed = new EmbedBuilder()
        .setTitle('🌐 Cotações Internacionais')
        .setDescription('Valores das principais moedas em relação ao Real Brasileiro (BRL)')
        .setColor(0x4CAF50)
        .setThumbnail('https://c.tenor.com/cLjA_QYEHesAAAAC/tenor.gif')
        .setTimestamp()
        .setFooter({ text: 'Dados fornecidos pelo Banco Central do Brasil' });

    let lastUpdateTime = null;

    for (const [currency, data] of Object.entries(quotations)) {
        if (data) {
            const symbol = CURRENCY_SYMBOLS[currency];
            const name = CURRENCY_NAMES[currency];
            embed.addFields({
                name: `${symbol} ${name} (${currency})`,
                value: `📥 Compra: R$ ${data.compra.toFixed(4)}\n📤 Venda: R$ ${data.venda.toFixed(4)}\n📊 Média: R$ ${data.media.toFixed(4)}`,
                inline: true
            });
            if (!lastUpdateTime || data.dataHora > lastUpdateTime) {
                lastUpdateTime = data.dataHora;
            }
        }
    }

    embed.addFields({ name: '\u200B', value: '\u200B' });

    if (lastUpdateTime) {
        embed.addFields({
            name: '🕰️ Última Atualização',
            value: `${lastUpdateTime.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
            inline: false
        });
    }

    return embed;
}

async function clearChannel(channel) {
    try {
        const messages = await channel.messages.fetch();
        await channel.bulkDelete(messages);
    } catch (error) {
        logger(`Erro ao limpar o canal ${channel.id}: ${error.message}`, 'error');
    }
}

async function updateQuotationEmbed(client) {
    const quotations = await fetchAllQuotations();
    if (!quotations) return;

    const guilds = await guildRepository.getAllGuilds();
    logger(`Atualizando cotações para ${guilds.length} guilds`, 'info');

    for (const guild of guilds) {
        if (!guild.quotationChannelId) {
            logger(`Guild ${guild.guildId} não tem canal de cotações configurado`, 'info');
            continue;
        }

        const channel = await client.channels.fetch(guild.quotationChannelId).catch(() => null);
        if (!channel) {
            logger(`Canal de cotações não encontrado para guild ${guild.guildId}`, 'warn');
            continue;
        }

        const embed = createQuotationEmbed(quotations);

        const messages = await channel.messages.fetch({ limit: 1 });
        const existingMessage = messages.first();

        if (existingMessage && existingMessage.author.id === client.user.id) {
            await existingMessage.edit({ embeds: [embed] });
            logger(`Cotação atualizada para guild ${guild.guildId}`, 'info');
        } else {
            await clearChannel(channel);
            await channel.send({ embeds: [embed] });
            logger(`Nova mensagem de cotação enviada para guild ${guild.guildId}`, 'info');
        }
    }
}

function scheduleQuotationUpdates(client) {
    logger('Iniciando agendador de cotações', 'info');
    cron.schedule('*/2 * * * *', () => {
        logger('Executando atualização de cotações', 'info');
        updateQuotationEmbed(client);
    });
}

module.exports = { scheduleQuotationUpdates };