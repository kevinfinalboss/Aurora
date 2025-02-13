const { SlashCommandBuilder, EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');
const { getPteroClient } = require('../../ptero/client');

module.exports = {
    name: 'list-directories',
    description: 'Lista os diretórios do servidor Pterodactyl',

    options: [
        {
            name: 'server',
            type: ApplicationCommandOptionType.String,
            description: 'Escolha um servidor',
            required: true,
            autocomplete: true
        }
    ],

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const PteroClient = await getPteroClient();
        const response = await PteroClient.listServers();

        if (!response || !response.data) {
            return interaction.respond([]);
        }

        const choices = response.data
            .filter(server => server.attributes.name.toLowerCase().includes(focusedValue))
            .map(server => ({
                name: server.attributes.name,
                value: server.attributes.identifier
            }))
            .slice(0, 25);

        await interaction.respond(choices);
    },

    async run(client, interaction) {
        await interaction.deferReply();

        const PteroClient = await getPteroClient();
        const serverID = interaction.options.getString('server');

        try {
            const response = await PteroClient.sendRequest('GET', `servers/${serverID}/files/list?directory=/`);

            if (!response || !response.data) {
                return interaction.editReply({ content: '❌ Erro ao buscar diretórios.', ephemeral: true });
            }

            // **Filtrando apenas os diretórios**
            const directories = response.data
                .filter(file => !file.attributes.is_file) // Apenas diretórios
                .map(dir => `📂 ${dir.attributes.name}`)
                .join('\n');

            if (!directories) {
                return interaction.editReply({ content: '📂 Nenhum diretório encontrado.', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle('📂 Diretórios do Servidor')
                .setDescription(`Aqui estão os diretórios do servidor **${serverID}**:`)
                .setColor(0x3498db)
                .addFields({ name: '🗂️ Diretórios:', value: directories })
                .setFooter({ text: 'Pterodactyl API', iconURL: 'https://i.imgur.com/1XfV7aM.png' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Erro ao listar diretórios:', error);
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('❌ Erro ao listar diretórios')
                        .setDescription('Não foi possível buscar os diretórios do servidor. Verifique a API e tente novamente.')
                        .setColor(0xff0000)
                        .setFooter({ text: 'Pterodactyl API', iconURL: 'https://i.imgur.com/1XfV7aM.png' })
                        .setTimestamp()
                ],
                ephemeral: true
            });
        }
    }
};
