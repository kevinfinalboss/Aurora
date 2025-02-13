const { SlashCommandBuilder, EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');
const { getPteroClient } = require('../../ptero/client');

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

        try {
            const PteroClient = await getPteroClient();
            const response = await PteroClient.listServers();
            
            if (!response || !response.data || response.data.length === 0) {
                return interaction.respond([]);
            }

            const choices = response.data
                .filter(server => server.attributes.name.toLowerCase().includes(focusedValue))
                .map(server => ({
                    name: server.attributes.name,
                    value: server.attributes.identifier
                }))
                .slice(0, 25); // Discord limita a 25 opções no autocomplete

            await interaction.respond(choices);
        } catch (error) {
            console.error('Erro ao carregar servidores para autocomplete:', error);
            await interaction.respond([]);
        }
    },

    async run(client, interaction) {
        await interaction.deferReply();

        const PteroClient = await getPteroClient();
        const serverID = interaction.options.getString('server');
        const action = interaction.options.getString('action');

        try {
            await PteroClient.sendPowerAction(serverID, action);
            const actionText = action === 'start' ? 'ligado' : action === 'stop' ? 'desligado' : 'reiniciado';

            const embed = new EmbedBuilder()
                .setTitle('✅ Sucesso!')
                .setDescription(`O servidor foi **${actionText}** com sucesso.`)
                .setColor(0x00ff00)
                .setFooter({ text: 'Pterodactyl API' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Erro ao controlar servidor:', error);
            await interaction.editReply({ content: '❌ Erro ao executar a ação. Verifique se o servidor está acessível.', ephemeral: true });
        }
    }
};
