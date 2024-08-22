const { PermissionsBitField, InteractionType, EmbedBuilder } = require("discord.js");
const { developers } = require("../../configuration/index");
const { logger } = require("../../functions/logger");

module.exports = {
    name: 'interactionCreate',
    execute: async (client, interaction) => {
        if (interaction.type === InteractionType.ApplicationCommand) {
            await handleApplicationCommand(client, interaction);
        } else if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
            await handleAutocomplete(client, interaction);
        } else if (interaction.isButton()) {
            await handleButtonInteraction(client, interaction);
        }
    }
};

async function handleApplicationCommand(client, interaction) {
    try {
        const command = client.slashCommands.get(interaction.commandName);

        if (!command) {
            return interaction.reply({
                content: `${interaction.commandName} is not a valid command`,
                ephemeral: true,
            });
        }

        if (command.developerOnly && !developers.includes(interaction.user.id)) {
            return interaction.reply({
                content: `${interaction.commandName} is a developer only command`,
                ephemeral: true,
            });
        }

        if (command.userPermissions && !interaction.channel.permissionsFor(interaction.member).has(PermissionsBitField.resolve(command.userPermissions))) {
            return interaction.reply({
                content: `You do not have the required permissions to use this command. You need the following permissions: ${command.userPermissions.join(", ")}`,
                ephemeral: true,
            });
        }

        if (command.clientPermissions && !interaction.channel.permissionsFor(interaction.guild.members.me).has(PermissionsBitField.resolve(command.clientPermissions))) {
            return interaction.reply({
                content: `I do not have the required permissions to use this command. I need the following permissions: ${command.clientPermissions.join(", ")}`,
                ephemeral: true,
            });
        }

        if (command.guildOnly && !interaction.guildId) {
            return interaction.reply({
                content: `${interaction.commandName} is a guild only command`,
                ephemeral: true,
            });
        }

        await command.run(client, interaction, interaction.options);
    } catch (err) {
        logger("An error occurred while processing a slash command:", "error");
        console.error('Erro ao processar comando de aplicação:', err);

        return interaction.reply({
            content: `An error has occurred while processing the command: ${err.message}`,
            ephemeral: true,
        }).catch(replyErr => {
            console.error('Erro ao tentar responder após falha no comando:', replyErr);
        });
    }
}

async function handleAutocomplete(client, interaction) {
    try {
        const command = client.slashCommands.get(interaction.commandName);

        if (!command || !command.autocomplete) {
            return;
        }

        await Promise.race([
            command.autocomplete(interaction),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Autocomplete timeout')), 3000))
        ]);
    } catch (error) {
        if (error.message === 'Autocomplete timeout') {
            console.error('Autocomplete timeout for command:', interaction.commandName);
        } else if (error.code === 10062) {
            console.error('Erro de interação desconhecida (10062). A interação provavelmente expirou.');
        } else {
            console.error('Erro ao processar autocomplete:', error);
        }
        logger("An error occurred while processing autocomplete:", "error");
    }
}

async function handleButtonInteraction(client, interaction) {
    const { customId } = interaction;
    const player = client.riffy.players.get(interaction.guildId);

    if (!player) {
        return interaction.reply({ content: "Não há player ativo neste servidor.", ephemeral: true });
    }

    switch (customId) {
        case 'pause_resume':
            player.pause(!player.paused);
            await interaction.reply({ content: player.paused ? "Música pausada." : "Música resumida.", ephemeral: true });
            break;
        case 'skip':
            player.stop();
            await interaction.reply({ content: "Música pulada.", ephemeral: true });
            break;
        case 'stop':
            player.destroy();
            await interaction.reply({ content: "Player parado e fila limpa.", ephemeral: true });
            break;
        case 'queue':
            const queue = player.queue;
            const currentTrack = player.currentTrack;
            let queueString = "";

            if (currentTrack) {
                queueString += `**Now Playing:** ${currentTrack.info.title}\n\n`;
            }

            if (queue.size) {
                queueString += queue.map((track, index) => 
                    `${index + 1}. ${track.info.title} - ${track.info.author}`
                ).join('\n');
            } else {
                queueString += "Não há mais músicas na fila.";
            }

            const queueEmbed = new EmbedBuilder()
                .setColor('#14bdff')
                .setTitle('Queue')
                .setDescription(queueString)
                .setFooter({ text: `Total de músicas: ${queue.size}` });

            await interaction.reply({ embeds: [queueEmbed], ephemeral: true });
            break;
        case 'view_commands':
            const commandsEmbed = new EmbedBuilder()
                .setColor('#4B0082')
                .setTitle('📜 Lista de Comandos')
                .setDescription('Aqui está uma lista dos principais comandos disponíveis:')
                .addFields(
                    { name: '/config', value: 'Configure as opções do bot para o seu servidor' },
                    { name: '/play', value: 'Reproduza uma música ou playlist' },
                    { name: '/clear', value: 'Bane um usuário do servidor' },
                    { name: '/kick', value: 'Expulsa um usuário do servidor' },
                    { name: '/mute', value: 'Silencia um usuário temporariamente' },
                    { name: '/warn', value: 'Dá um aviso a um usuário' },
                    { name: '/stats', value: 'Mostra estatísticas do servidor' },
                    { name: '/help', value: 'Exibe a lista completa de comandos e suas descrições' }
                )
                .setTimestamp()
                .setFooter({ text: 'Use /help para mais detalhes sobre cada comando', iconURL: client.user.displayAvatarURL() });

            await interaction.reply({ embeds: [commandsEmbed], ephemeral: true });
            break;
    }
}