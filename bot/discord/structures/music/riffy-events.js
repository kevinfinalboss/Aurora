const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { logger } = require('../functions/logger');

function setupRiffyEvents(client) {
    if (!client.riffy) {
        logger("client.riffy não está definido. Verifique se o Riffy foi inicializado corretamente.", "error");
        return;
    }

    client.riffy.on("nodeConnect", node => {
        logger(`Node "${node.host}" conectado.`, "info");
    });

    client.riffy.on("nodeError", (node, error) => {
        logger(`Node "${node.host}" encontrou um erro: ${error.message}.`, "error");
    });

    client.riffy.on("nodeDisconnect", (node) => {
        logger(`Node "${node.host}" desconectado.`, "warn");
    });

    client.riffy.on("trackStart", async (player, track) => {
        try {
            const channel = client.channels.cache.get(player.textChannel);
            if (!channel) {
                logger(`Canal não encontrado para player ${player.guild}`, "warn");
                return;
            }

            if (player.nowPlayingMessage) {
                await player.nowPlayingMessage.delete().catch(err => logger(`Erro ao deletar mensagem: ${err.message}`, "error"));
            }

            const requester = track.info.requester;
            const details = `**Título:** ${track.info.title}\n` +
            `**Artista:** ${track.info.author}\n` +
            `**Duração:** ${formatDuration(track.info.length)}\n` +
            `**Solicitado por:** ${requester.username}`;

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

            player.nowPlayingMessage = await channel.send({ embeds: [musicEmbed], components: [row] });

            clearTimeout(player.inactivityTimeout);
            player.inactivityTimeout = setTimeout(() => checkInactivity(player, channel), 60000);
        } catch (error) {
            logger(`Erro no evento trackStart: ${error.message}`, "error");
        }
    });

    client.riffy.on("queueEnd", async (player) => {
        try {
            const channel = client.channels.cache.get(player.textChannel);
            if (!channel) {
                logger(`Canal não encontrado para player ${player.guild}`, "warn");
                return;
            }

            player.destroy();
            const embed = new EmbedBuilder()
                .setColor('#ffff00')
                .setAuthor({
                    name: 'Fila Encerrada!',
                    iconURL: 'https://cdn.discordapp.com/attachments/1230824451990622299/1230824519220985896/6280-2.gif?ex=6641e8a8&is=66409728&hm=149efc9db2a92eb90c70f0a6fb15618a5b912b528f6b1dcf1b517c77a72a733a&',
                    url: 'https://discord.gg/xQF9f9yUEM'
                })
                .setDescription('**Tchau Tchau! Não há mais músicas para tocar...**')
                .addFields(
                    { name: 'Total de músicas tocadas', value: (player.playedTracks?.length || 0).toString() },
                    { name: 'Duração total da sessão', value: formatDuration(player.playedTime) }
                )
                .setTimestamp();
            
            if (player.nowPlayingMessage) {
                await player.nowPlayingMessage.delete().catch(err => logger(`Erro ao deletar mensagem: ${err.message}`, "error"));
            }
            
            await channel.send({ embeds: [embed] }).catch(err => logger(`Erro ao enviar mensagem de fim de fila: ${err.message}`, "error"));
        } catch (error) {
            logger(`Erro no evento queueEnd: ${error.message}`, "error");
        }
    });

    client.riffy.on("trackError", (player, track, error) => {
        logger(`Erro ao reproduzir a faixa ${track.title}: ${error}`, "error");
        const channel = client.channels.cache.get(player.textChannel);
        if (channel) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Erro na Reprodução')
                .setDescription(`Ocorreu um erro ao tentar reproduzir **${track.title}**. Pulando para a próxima faixa.`)
                .setTimestamp();
            channel.send({ embeds: [errorEmbed] }).catch(err => logger(`Erro ao enviar mensagem de erro: ${err.message}`, "error"));
        }
        player.stop();
    });
}

function formatDuration(duration) {
    const seconds = Math.floor((duration / 1000) % 60);
    const minutes = Math.floor((duration / (1000 * 60)) % 60);
    const hours = Math.floor(duration / (1000 * 60 * 60));

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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

function checkInactivity(player, channel) {
    try {
        const voiceChannel = channel.guild.channels.cache.get(player.voiceChannel);
        if (voiceChannel && voiceChannel.members.size === 1) {
            player.destroy();
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setAuthor({
                    name: 'Inatividade Detectada',
                    iconURL: channel.client.user.displayAvatarURL(),
                    url: 'https://discord.gg/xQF9f9yUEM'
                })
                .setDescription('Saí do canal de voz devido à inatividade.')
                .setThumbnail(channel.client.user.displayAvatarURL())
                .addFields(
                    { name: 'Tempo de inatividade', value: '1 minuto' },
                    { name: 'Total de músicas tocadas', value: player.playedTracks.length.toString() },
                    { name: 'Duração total da sessão', value: formatDuration(player.playedTime) }
                )
                .setFooter({ text: 'Música Encerrada', iconURL: channel.client.user.displayAvatarURL() })
                .setTimestamp();

            channel.send({ embeds: [embed] }).catch(err => logger(`Erro ao enviar mensagem de inatividade: ${err.message}`, "error"));
        } else {
            player.inactivityTimeout = setTimeout(() => checkInactivity(player, channel), 60000);
        }
    } catch (error) {
        logger(`Erro na verificação de inatividade: ${error.message}`, "error");
    }
}

module.exports = { setupRiffyEvents };