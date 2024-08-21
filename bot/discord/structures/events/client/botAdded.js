const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { logger } = require('../../functions/logger');

module.exports = {
    name: Events.GuildCreate,
    once: false,
    execute: async (client, guild) => {
        try {
            const owner = await guild.fetchOwner();
            await sendWelcomeEmbed(owner.user);
            logger(`Bot adicionado ao servidor: ${guild.name} (ID: ${guild.id})`, 'info');
        } catch (error) {
            logger(`Erro ao processar adição do bot ao servidor ${guild.name}: ${error.message}`, 'error');
        }
    }
};

async function sendWelcomeEmbed(user) {
    const embed = new EmbedBuilder()
        .setColor('#4B0082')
        .setTitle('🎉 Obrigado por adicionar o AssistantBot!')
        .setDescription('Estou aqui para tornar seu servidor mais incrível! Veja abaixo um resumo das minhas principais funcionalidades.')
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: '🛡️ Moderação', value: 'Mantenha seu servidor seguro com comandos de moderação avançados e um sistema de AutoMod customizável.' },
            { name: '🎊 Boas-vindas e Despedidas', value: 'Crie mensagens personalizadas para novos membros e para aqueles que saem do servidor.' },
            { name: '🎵 Música', value: 'Reproduza suas músicas favoritas com alta qualidade e sem anúncios.' },
            { name: '🎰 Minijogos', value: 'Divirta-se com uma variedade de minijogos interativos.' },
            { name: '📊 Estatísticas', value: 'Acompanhe o crescimento do seu servidor com gráficos e relatórios detalhados.' },
            { name: '⚙️ Configuração', value: 'Use `/config` para personalizar o bot de acordo com as necessidades do seu servidor.' }
        )
        .setImage('https://i.imgur.com/XfYCdiY.png')
        .setTimestamp()
        .setFooter({ text: 'AssistantBot - Seu companheiro multifuncional', iconURL: client.user.displayAvatarURL() });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel('Documentação')
                .setStyle(ButtonStyle.Link)
                .setURL('https://assistantbot.com/docs'),
            new ButtonBuilder()
                .setLabel('Suporte')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.gg/assistantbot'),
            new ButtonBuilder()
                .setLabel('Comandos')
                .setCustomId('view_commands')
                .setStyle(ButtonStyle.Primary)
        );

    try {
        await user.send({ embeds: [embed], components: [row] });
        logger(`Embed de boas-vindas enviado para ${user.tag}`, 'info');
    } catch (error) {
        logger(`Não foi possível enviar DM para ${user.tag}: ${error.message}`, 'warn');
    }
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'view_commands') {
        const commandsEmbed = new EmbedBuilder()
            .setColor('#4B0082')
            .setTitle('📜 Lista de Comandos')
            .setDescription('Aqui está uma lista dos principais comandos disponíveis:')
            .addFields(
                { name: '/config', value: 'Configure as opções do bot para o seu servidor' },
                { name: '/play', value: 'Reproduza uma música ou playlist' },
                { name: '/ban', value: 'Bane um usuário do servidor' },
                { name: '/kick', value: 'Expulsa um usuário do servidor' },
                { name: '/mute', value: 'Silencia um usuário temporariamente' },
                { name: '/warn', value: 'Dá um aviso a um usuário' },
                { name: '/stats', value: 'Mostra estatísticas do servidor' },
                { name: '/help', value: 'Exibe a lista completa de comandos e suas descrições' }
            )
            .setTimestamp()
            .setFooter({ text: 'Use /help para mais detalhes sobre cada comando', iconURL: client.user.displayAvatarURL() });

        await interaction.reply({ embeds: [commandsEmbed], ephemeral: true });
    }
});