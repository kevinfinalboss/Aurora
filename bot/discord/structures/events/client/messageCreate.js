const { PermissionsBitField, EmbedBuilder } = require("discord.js");
const { client_prefix, developers } = require("../../configuration/index");
const { logger } = require("../../functions/logger");
const guildRepository = require('../../database/repository/guildRepository');

module.exports = {
    name: 'messageCreate',
    execute: async (client, message) => {
        try {
            if (message.author.bot || !message.guild) return;

            const guildSettings = await guildRepository.getGuildSettings(message.guild.id);
            if (guildSettings.automod && guildSettings.automod.enabled) {
                const containsBannedWord = guildSettings.automod.bannedWords.some(word => 
                    message.content.toLowerCase().includes(word.toLowerCase())
                );
                const mentionCount = message.mentions.users.size + message.mentions.roles.size;

                if (containsBannedWord || mentionCount > guildSettings.automod.maxMentions) {
                    await message.delete();

                    const warningEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('Aviso de AutoMod')
                        .setDescription(`Sua mensagem foi removida por violar as regras do servidor.`)
                        .addFields(
                            { name: 'Motivo', value: containsBannedWord ? 'Uso de linguagem proibida' : 'Excesso de menções' },
                            { name: 'Ação', value: 'Mensagem deletada' },
                            { name: 'Servidor', value: message.guild.name }
                        )
                        .setTimestamp()
                        .setFooter({ text: `ID do Usuário: ${message.author.id}` });

                    try {
                        await message.author.send({ embeds: [warningEmbed] });
                        logger(`Aviso de AutoMod enviado para ${message.author.tag} no servidor ${message.guild.name}`, "info");
                    } catch (error) {
                        logger(`Não foi possível enviar DM para ${message.author.tag} no servidor ${message.guild.name}`, "warn");
                    }

                    if (guildSettings.automod.logChannelId) {
                        const modChannel = message.guild.channels.cache.get(guildSettings.automod.logChannelId);
                        if (modChannel) {
                            modChannel.send({ embeds: [warningEmbed] });
                            logger(`Log de AutoMod enviado para o canal ${modChannel.name} no servidor ${message.guild.name}`, "info");
                        }
                    }

                    return;
                }

            }

            if (!message.content.startsWith(client_prefix)) return;

            const args = message.content.slice(client_prefix.length).trim().split(/ +/g);
            const cmd = args.shift().toLowerCase();

            if (cmd.length === 0) return;

            let command = client.commands.get(cmd);
            if (!command) command = client.commands.get(client.aliases.get(cmd));

            if (command) {
                if (command.developerOnly && !developers.includes(message.author.id)) {
                    return message.channel.send(`:x: ${command.name} é um comando exclusivo para desenvolvedores.`);
                }

                if (command.userPermissions && !message.member.permissions.has(PermissionsBitField.resolve(command.userPermissions))) {
                    return message.channel.send(`Você não tem as permissões necessárias para usar este comando. Você precisa das seguintes permissões: ${command.userPermissions.join(", ")}`);
                }

                if (command.clientPermissions && !message.guild.members.me.permissions.has(PermissionsBitField.resolve(command.clientPermissions))) {
                    return message.channel.send(`Eu não tenho as permissões necessárias para executar este comando. Eu preciso das seguintes permissões: ${command.clientPermissions.join(", ")}`);
                }

                if (command.guildOnly && !message.guildId) {
                    return message.channel.send(`${command.name} é um comando exclusivo para servidores.`);
                }

                await command.run(client, message, args);
            }
        } catch (err) {
            logger("Ocorreu um erro ao executar o evento messageCreate:", "error");
            console.error(err);

            return message.channel.send(`Ocorreu um erro ao executar o comando:\n\`\`\`${err.message}\`\`\``);
        }
    }
};