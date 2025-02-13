const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getPteroClient } = require('../../ptero/client');

module.exports = {
    name: 'list-servers',
    description: 'Lista todos os servidores do Pterodactyl',
    data: new SlashCommandBuilder()
        .setName('list-servers')
        .setDescription('Lista todos os servidores do Pterodactyl'),
    
    async run(client, interaction) {
        await interaction.deferReply();
        
        try {
            const PteroClient = await getPteroClient();
            const servers = await PteroClient.listServers();
            
            if (!servers || servers.data.length === 0) {
                return interaction.editReply({ content: '🔍 Nenhum servidor encontrado.', ephemeral: true });
            }
            
            const embed = new EmbedBuilder()
                .setTitle('📜 Lista de Servidores')
                .setDescription('Aqui estão os seus servidores registrados no **Pterodactyl**:')
                .setColor(0x00ff00)
                .setFooter({ text: '💻 Powered by Pterodactyl API' })
                .setTimestamp();

            servers.data.forEach(server => {
                let status = '⚪ Desconhecido';
                if (server.attributes.status === 'running') status = '🟢 Online';
                else if (server.attributes.status === 'offline') status = '🔴 Offline';
                else if (server.attributes.status === 'starting') status = '🟡 Iniciando';
                else if (server.attributes.status === 'stopping') status = '🟠 Parando';

                let extraStatus = '';
                if (server.attributes.is_suspended) extraStatus += '⛔ **Suspenso**\n';
                if (server.attributes.is_installing) extraStatus += '⚙️ **Instalando**\n';
                if (server.attributes.is_transferring) extraStatus += '📤 **Transferindo**\n';

                embed.addFields({
                    name: `🔹 ${server.attributes.name}`,
                    value: `**🆔 ID:** \`${server.attributes.identifier}\`
` +
                        `**🖥️ Node:** \`${server.attributes.node}\`
` +
                        `**💾 Armazenamento:** \`${server.attributes.limits.disk} MB\`
` +
                        `**🧠 Memória:** \`${server.attributes.limits.memory} MB\`
` +
                        `**⚙️ CPU:** \`${server.attributes.limits.cpu}%\`
` +
                        `**🟢 Status:** \`${status}\`
` +
                        `${extraStatus}`
                });
            });

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Erro ao listar servidores:', error);
            await interaction.editReply({ content: '❌ Erro ao buscar servidores. Tente novamente mais tarde.', ephemeral: true });
        }
    }
};
