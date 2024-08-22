const { PermissionsBitField, InteractionType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
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
                content: `${interaction.commandName} não é um comando válido`,
                ephemeral: true,
            });
        }

        if (command.developerOnly && !developers.includes(interaction.user.id)) {
            return interaction.reply({
                content: `${interaction.commandName} é um comando exclusivo para desenvolvedores`,
                ephemeral: true,
            });
        }

        if (command.userPermissions && !interaction.channel.permissionsFor(interaction.member).has(PermissionsBitField.resolve(command.userPermissions))) {
            return interaction.reply({
                content: `Você não tem as permissões necessárias para usar este comando. Você precisa das seguintes permissões: ${command.userPermissions.join(", ")}`,
                ephemeral: true,
            });
        }

        if (command.clientPermissions && !interaction.channel.permissionsFor(interaction.guild.members.me).has(PermissionsBitField.resolve(command.clientPermissions))) {
            return interaction.reply({
                content: `Eu não tenho as permissões necessárias para usar este comando. Eu preciso das seguintes permissões: ${command.clientPermissions.join(", ")}`,
                ephemeral: true,
            });
        }

        if (command.guildOnly && !interaction.guildId) {
            return interaction.reply({
                content: `${interaction.commandName} é um comando exclusivo para servidores`,
                ephemeral: true,
            });
        }

        await command.run(client, interaction, interaction.options);
    } catch (err) {
        logger("Ocorreu um erro ao processar um comando slash:", "error");
        console.error('Erro ao processar comando de aplicação:', err);

        return interaction.reply({
            content: `Ocorreu um erro ao processar o comando: ${err.message}`,
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
            console.error('Timeout de autocomplete para o comando:', interaction.commandName);
        } else if (error.code === 10062) {
            console.error('Erro de interação desconhecida (10062). A interação provavelmente expirou.');
        } else {
            console.error('Erro ao processar autocomplete:', error);
        }
        logger("Ocorreu um erro ao processar o autocomplete:", "error");
    }
}

async function handleButtonInteraction(client, interaction) {
    const { customId } = interaction;
    const player = client.riffy.players.get(interaction.guildId);

    if (!player && customId !== 'view_commands') {
        return interaction.reply({ content: "Não há player ativo neste servidor.", ephemeral: true });
    }

    let actionEmbed;

    switch (customId) {
        case 'pause_resume':
            player.pause(!player.paused);
            actionEmbed = createActionEmbed(interaction.user, player, player.paused ? 'Pausou' : 'Retomou');
            await interaction.deferUpdate();
            break;
        case 'skip':
            const skippedTrack = player.currentTrack;
            player.stop();
            actionEmbed = createActionEmbed(interaction.user, player, 'Pulou', skippedTrack);
            await interaction.deferUpdate();
            break;
        case 'stop':
            player.destroy();
            actionEmbed = createActionEmbed(interaction.user, player, 'Parou');
            if (player.nowPlayingMessage) {
                await player.nowPlayingMessage.delete().catch(console.error);
            }
            await interaction.reply({ content: "Player parado e fila limpa.", ephemeral: true });
            break;
        case 'queue':
            await showQueue(player, interaction);
            return;
        case 'view_commands':
            await showCommandsList(client, interaction);
            return;
    }

    if (actionEmbed) {
        const sentMessage = await interaction.channel.send({ embeds: [actionEmbed] });
        setTimeout(() => sentMessage.delete().catch(console.error), 60000);
    }

    if (player && player.nowPlayingMessage) {
        await updateNowPlayingEmbed(player, interaction);
    }
}

async function updateNowPlayingEmbed(player, interaction) {
    if (!player.nowPlayingMessage) return;

    const track = player.currentTrack;
    if (!track) return;

    const requester = track.info.requester;
    const details = `**Título:** ${track.info.title}\n` +
    `**Artista:** ${track.info.author}\n` +
    `**Duração:** ${formatDuration(track.info.length)}\n` +
    `**Solicitado por:** ${requester.username}\n` +
    `**Status:** ${player.paused ? "Pausado" : "Tocando"}`;

    const musicEmbed = new EmbedBuilder()
        .setColor("#FF7A00")
        .setAuthor({
            name: 'Tocando agora',
            iconURL: 'https://cdn.discordapp.com/attachments/1140841446228897932/1144671132948103208/giphy.gif', 
            url: 'https://discord.gg/xQF9f9yUEM'
        })
        .setDescription(details)
        .setThumbnail(track.info.thumbnail)
        .addFields(
            { name: 'Posição na fila', value: '1', inline: true },
            { name: 'Músicas restantes', value: player.queue.size.toString(), inline: true },
            { name: 'Volume', value: `${player.volume}%`, inline: true }
        )
        .setFooter({ text: `Solicitado por ${requester.username}`, iconURL: requester.displayAvatarURL() });

    const row = createMusicControlButtons();

    await player.nowPlayingMessage.edit({ embeds: [musicEmbed], components: [row] });
}

async function showQueue(player, interaction) {
    const queue = player.queue;
    const currentTrack = player.currentTrack;
    let queueString = "";

    if (currentTrack) {
        queueString += `**Tocando Agora:** ${currentTrack.info.title} - Solicitado por ${currentTrack.info.requester.username}\n\n`;
    }

    if (queue.size) {
        queueString += queue.map((track, index) => 
            `${index + 1}. ${track.info.title} - ${track.info.author} - Solicitado por ${track.info.requester.username}`
        ).join('\n');
    } else {
        queueString += "Não há mais músicas na fila.";
    }

    const totalDuration = queue.reduce((acc, track) => acc + track.info.length, 0);
    const queueDuration = currentTrack ? totalDuration + currentTrack.info.length : totalDuration;

    const queueEmbed = new EmbedBuilder()
        .setColor('#14bdff')
        .setTitle('Fila de Reprodução')
        .setDescription(queueString)
        .addFields(
            { name: 'Total de músicas', value: (queue.size + (currentTrack ? 1 : 0)).toString(), inline: true },
            { name: 'Duração Total', value: formatDuration(queueDuration), inline: true },
        )
        .setFooter({ text: `Solicitado por ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

    await interaction.reply({ embeds: [queueEmbed], ephemeral: true });
}

async function showCommandsList(client, interaction) {
    const commandsEmbed = new EmbedBuilder()
        .setColor('#4B0082')
        .setTitle('📜 Lista de Comandos')
        .setDescription('Aqui está uma lista dos principais comandos disponíveis:')
        .addFields(
            { name: '/config', value: 'Configure as opções do bot para o seu servidor' },
            { name: '/play', value: 'Reproduza uma música ou playlist' },
            { name: '/clear', value: 'Limpa mensagens do chat' },
            { name: '/help', value: 'Exibe a lista completa de comandos e suas descrições' },
            { name: '/vlrteams', value: 'Obter informações sobre times de Valorant' },
            { name: '/vlrteaminfo', value: 'Obter informações detalhadas sobre um time de Valorant' },
            { name: '/avatar', value: 'Exibe o avatar de um usuário' },
            { name: '/acao', value: 'Obter informações sobre uma ação' },
            { name: '/price', value: 'Obter a cotação atual de uma moeda em relação ao Real (BRL)' },
            { name: '/crypto', value: 'Obter a cotação atual de uma criptomoeda em relação ao Real (BRL) e Dólar (USD)' },
            { name: '/fii', value: 'Obter informações sobre um Fundo de Investimento Imobiliário (FII)' },
            { name: '/inflacao', value: 'Obter informações sobre a inflação de um país' },
            { name: '/cep', value: 'Busca informações de um CEP' },
            { name: '/imc', value: 'Calcular o Índice de Massa Corporal (IMC)' },
            { name: '/qrcode', value: 'Gera um QR code para um link fornecido' }
        )
        .setTimestamp()
        .setFooter({ text: 'Use /help para mais detalhes sobre cada comando', iconURL: client.user.displayAvatarURL() });

    await interaction.reply({ embeds: [commandsEmbed], ephemeral: true });
}

function createMusicControlButtons() {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('pause_resume')
                .setLabel('Pausar/Retomar')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('skip')
                .setLabel('Pular')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('stop')
                .setLabel('Parar')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('queue')
                .setLabel('Ver Fila')
                .setStyle(ButtonStyle.Success)
        );
}

function formatDuration(duration) {
    const seconds = Math.floor((duration / 1000) % 60);
    const minutes = Math.floor((duration / (1000 * 60)) % 60);
    const hours = Math.floor(duration / (1000 * 60 * 60));

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function createActionEmbed(user, player, action, track = null) {
    const embed = new EmbedBuilder()
        .setColor('#1DB954')
        .setAuthor({
            name: `${user.username} ${action} a música`,
            iconURL: user.displayAvatarURL()
        })
        .setTimestamp();

    if (player.currentTrack) {
        embed.addFields(
            { name: 'Música Atual', value: player.currentTrack.info.title },
            { name: 'Artista', value: player.currentTrack.info.author },
            { name: 'Duração', value: formatDuration(player.currentTrack.info.length) },
            { name: 'Status', value: player.paused ? 'Pausado' : 'Tocando' },
            { name: 'Posição na fila', value: '1', inline: true },
            { name: 'Músicas restantes', value: player.queue.size.toString(), inline: true },
            { name: 'Volume', value: `${player.volume}%`, inline: true }
        );
    }

    if (action === 'Pulou' && track) {
        embed.addFields(
            { name: 'Música Pulada', value: track.info.title },
            { name: 'Próxima Música', value: player.queue.size > 0 ? player.queue[0].info.title : 'Nenhuma' }
        );
    }

    return embed;
}