const { Events, EmbedBuilder } = require('discord.js');
const guildRepository = require('../../database/repository/guildRepository');
const { logger } = require('../../functions/logger');

module.exports = {
    name: Events.GuildMemberRemove,
    once: false,
    execute: async (client, member) => {
        try {
            const guildSettings = await guildRepository.getGuildSettings(member.guild.id);
            if (!guildSettings.leaveChannelId) return;

            const leaveChannel = member.guild.channels.cache.get(guildSettings.leaveChannelId);
            if (!leaveChannel) return;

            const leaveEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Membro saiu do servidor')
                .setDescription(`${member.user.tag} deixou o servidor.`)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    { name: 'Membro', value: `${member.user.tag}`, inline: true },
                    { name: 'Entrou em', value: member.joinedAt.toLocaleDateString(), inline: true }
                )
                .setImage(member.guild.iconURL({ dynamic: true, size: 256 }))
                .setTimestamp()
                .setFooter({ text: `ID: ${member.id}`, iconURL: member.guild.iconURL() });

            await leaveChannel.send({ embeds: [leaveEmbed] });
            logger(`Mensagem de saída enviada para ${member.user.tag} no servidor ${member.guild.name}`, 'info');
        } catch (error) {
            logger(`Erro ao processar saída de membro ${member.user.tag}: ${error.message}`, 'error');
        }
    }
};