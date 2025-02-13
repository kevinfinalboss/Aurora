const { SlashCommandBuilder, EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');
const { getPteroClient } = require('../../ptero/client');
const axios = require('axios');
const FormData = require('form-data');

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

async function fetchDirectories(serverID) {
    try {
        if (!serverID) return [];
        const PteroClient = await getPteroClient();
        const response = await PteroClient.sendRequest('GET', `servers/${serverID}/files/list?directory=/`);
        if (!response || !response.data) return [];

        return response.data
            .filter(file => !file.attributes.is_file)
            .map(dir => ({ name: `📂 ${dir.attributes.name}`, value: dir.attributes.name }));
    } catch (error) {
        console.error('Erro ao buscar diretórios:', error);
        return [];
    }
}

module.exports = {
    name: 'upload-file',
    description: 'Envia um arquivo para o servidor selecionado',
    
    options: [
        {
            name: 'server',
            type: ApplicationCommandOptionType.String,
            description: 'Escolha um servidor',
            required: true,
            autocomplete: true
        },
        {
            name: 'directory',
            type: ApplicationCommandOptionType.String,
            description: 'Escolha o diretório',
            required: true,
            autocomplete: true
        },
        {
            name: 'file',
            type: ApplicationCommandOptionType.Attachment,
            description: 'O arquivo a ser enviado',
            required: true
        }
    ],

    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        
        if (focusedOption.name === 'server') {
            const servers = await fetchServers();
            if (!servers.length) return interaction.respond([{ name: 'Nenhum servidor encontrado', value: 'none' }]);
            await interaction.respond(servers.slice(0, 25));
        } else if (focusedOption.name === 'directory') {
            const serverID = interaction.options.getString('server');
            if (!serverID) return interaction.respond([]);
            const directories = await fetchDirectories(serverID);
            if (!directories.length) return interaction.respond([{ name: 'Nenhum diretório encontrado', value: 'none' }]);
            await interaction.respond(directories.slice(0, 25));
        }
    },

    async run(client, interaction) {
        await interaction.deferReply();

        const PteroClient = await getPteroClient();
        const serverID = interaction.options.getString('server');
        const directory = interaction.options.getString('directory');
        const file = interaction.options.getAttachment('file');

        if (!file || !file.url) {
            return interaction.editReply({ content: '❌ Arquivo inválido ou não anexado.', ephemeral: true });
        }

        try {
            const uploadResponse = await PteroClient.sendRequest('GET', `servers/${serverID}/files/upload`);
            if (!uploadResponse || !uploadResponse.attributes || !uploadResponse.attributes.url) {
                throw new Error('Falha ao obter URL de upload.');
            }

            const fileResponse = await axios.get(file.url, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(fileResponse.data);

            const formData = new FormData();
            formData.append('files', buffer, {
                filename: file.name,
                contentType: file.contentType || 'application/octet-stream'
            });

            const url = new URL(uploadResponse.attributes.url);
            const token = url.searchParams.get('token');

            const uploadInstance = axios.create({
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            await uploadInstance.put(uploadResponse.attributes.url, formData, {
                headers: {
                    ...formData.getHeaders(),
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const embed = new EmbedBuilder()
                .setTitle('✅ Arquivo Enviado')
                .setDescription(`O arquivo **${file.name}** foi enviado para o servidor **${serverID}** no diretório **${directory}**.`)
                .setColor(0x00ff00)
                .addFields(
                    { name: '📡 Servidor', value: `\`${serverID}\``, inline: true },
                    { name: '📂 Diretório', value: `\`${directory}\``, inline: true },
                    { name: '📄 Arquivo', value: `\`${file.name}\``, inline: false },
                    { name: '⏰ Horário', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                )
                .setFooter({ text: 'Pterodactyl API', iconURL: 'https://i.imgur.com/1XfV7aM.png' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Erro ao enviar arquivo:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                headers: error.response?.headers
            });
            
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('❌ Erro ao Enviar Arquivo')
                        .setDescription('Não foi possível enviar o arquivo para o servidor. Verifique a API e tente novamente.')
                        .setColor(0xff0000)
                        .setFooter({ text: 'Pterodactyl API', iconURL: 'https://i.imgur.com/1XfV7aM.png' })
                        .setTimestamp()
                ],
                ephemeral: true
            });
        }
    }
};