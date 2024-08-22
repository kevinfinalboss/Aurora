const { Events, EmbedBuilder } = require('discord.js');
const guildRepository = require('../../database/repository/guildRepository');
const { logger } = require('../../functions/logger');

module.exports = {
    name: Events.GuildMemberAdd,
    once: false,
    execute: async (client, member) => {
        try {
            const guildSettings = await guildRepository.getGuildSettings(member.guild.id);
            if (!guildSettings.welcomeChannelId) return;

            const welcomeChannel = member.guild.channels.cache.get(guildSettings.welcomeChannelId);
            if (!welcomeChannel) return;

            const welcomeEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('Bem-vindo ao servidor!')
                .setDescription(`Olá ${member}, seja bem-vindo ao ${member.guild.name}!`)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    { name: 'Membro', value: `${member.user.tag}`, inline: true },
                    { name: 'Conta criada em', value: member.user.createdAt.toLocaleDateString(), inline: true }
                )
                .setImage(member.guild.iconURL({ dynamic: true, size: 256 }))
                .setTimestamp()
                .setFooter({ text: `ID: ${member.id}`, iconURL: member.guild.iconURL() });

            await welcomeChannel.send({ embeds: [welcomeEmbed] });
            logger(`Mensagem de boas-vindas enviada para ${member.user.tag} no servidor ${member.guild.name}`, 'info');
        } catch (error) {
            logger(`Erro ao processar entrada de membro ${member.user.tag}: ${error.message}`, 'error');
        }
    }
};