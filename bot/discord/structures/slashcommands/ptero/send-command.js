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
    name: 'send-command',
    description: 'Envia um comando para o servidor selecionado',
    
    options: [
        {
            name: 'server',
            type: ApplicationCommandOptionType.String,
            description: 'Escolha um servidor',
            required: true,
            autocomplete: true
        },
        {
            name: 'command',
            type: ApplicationCommandOptionType.String,
            description: 'Digite o comando a ser enviado',
            required: true
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
        const command = interaction.options.getString('command');

        try {
            await PteroClient.sendRequest('POST', `servers/${serverID}/command`, { command });

            const embed = new EmbedBuilder()
                .setTitle('✅ Comando Enviado')
                .setDescription(`O comando foi enviado com sucesso para o servidor **${serverID}**!`)
                .setColor(0x00ff00)
                .addFields(
                    { name: '📡 Servidor', value: `\`${serverID}\``, inline: true },
                    { name: '💬 Comando', value: `\`${command}\``, inline: false },
                    { name: '⏰ Horário', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                )
                .setFooter({ text: 'Pterodactyl API', iconURL: 'https://i.imgur.com/1XfV7aM.png' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Erro ao enviar comando:', error);
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('❌ Erro ao Enviar Comando')
                        .setDescription('Houve um erro ao tentar enviar o comando para o servidor. Verifique se ele está acessível e tente novamente.')
                        .setColor(0xff0000)
                        .setFooter({ text: 'Pterodactyl API', iconURL: 'https://i.imgur.com/1XfV7aM.png' })
                        .setTimestamp()
                ],
                ephemeral: true
            });
        }
    }
};
