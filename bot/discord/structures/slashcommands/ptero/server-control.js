const { SlashCommandBuilder, EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');
const { getPteroClient } = require('../../ptero/client');

let cachedServers = [];
let lastCacheUpdate = 0;
const CACHE_DURATION = 60 * 1000;

async function fetchServers() {
    if (Date.now() - lastCacheUpdate < CACHE_DURATION && cachedServers.length > 0) {
        return cachedServers;
    }

    try {
        const PteroClient = await getPteroClient();
        const response = await PteroClient.listServers();
        if (!response || !response.data) return [];

        cachedServers = response.data.map(server => ({
            name: server.attributes.name,
            value: server.attributes.identifier
        }));

        lastCacheUpdate = Date.now();
        return cachedServers;
    } catch (error) {
        console.error('Erro ao buscar servidores:', error);
        return [];
    }
}

module.exports = {
    name: 'server-control',
    description: 'Controla os servidores do Pterodactyl',
    
    options: [
        {
            name: 'server',
            type: ApplicationCommandOptionType.String,
            description: 'Escolha um servidor',
            required: true,
            autocomplete: true
        },
        {
            name: 'action',
            type: ApplicationCommandOptionType.String,
            description: 'Escolha a ação',
            required: true,
            choices: [
                { name: 'Ligar', value: 'start' },
                { name: 'Desligar', value: 'stop' },
                { name: 'Reiniciar', value: 'restart' }
            ]
        }
    ],

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const servers = await fetchServers();

        const choices = servers
            .filter(server => server.name.toLowerCase().includes(focusedValue))
            .slice(0, 25);

        await interaction.respond(choices);
    },

    async run(client, interaction) {
        await interaction.deferReply();

        const PteroClient = await getPteroClient();
        const serverID = interaction.options.getString('server');
        const action = interaction.options.getString('action');

        try {
            await PteroClient.sendPowerAction(serverID, action);
            const actionText = action === 'start' ? '🔵 Ligado' : action === 'stop' ? '🔴 Desligado' : '🔄 Reiniciado';

            const embed = new EmbedBuilder()
                .setTitle('✅ Ação Executada')
                .setDescription(`O servidor **${serverID}** foi **${actionText}** com sucesso!`)
                .setColor(action === 'start' ? 0x00ff00 : action === 'stop' ? 0xff0000 : 0xffa500)
                .setThumbnail('https://i.imgur.com/HbElFNf.png')
                .addFields(
                    { name: '🔍 Servidor', value: `\`${serverID}\``, inline: true },
                    { name: '⚡ Ação', value: `\`${actionText}\``, inline: true },
                    { name: '📅 Horário', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                )
                .setFooter({ text: 'Pterodactyl API', iconURL: 'https://i.imgur.com/1XfV7aM.png' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Erro ao controlar servidor:', error);
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('❌ Erro ao executar ação')
                        .setDescription('Houve um erro ao tentar controlar o servidor. Verifique se o servidor está acessível e tente novamente.')
                        .setColor(0xff0000)
                        .setFooter({ text: 'Pterodactyl API', iconURL: 'https://i.imgur.com/1XfV7aM.png' })
                        .setTimestamp()
                ],
                ephemeral: true
            });
        }
    }
};