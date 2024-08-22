const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ApplicationCommandOptionType } = require('discord.js');
const YouTube = require('youtube-search-api');

module.exports = {
    name: "play",
    description: "Toca uma música",
    options: [
        {
            name: "query",
            description: "Nome da música ou URL",
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true
        }
    ],
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        if (focusedValue.length < 3) return interaction.respond([]);

        try {
            const searchResults = await YouTube.GetListByKeyword(focusedValue, false, 5);
            
            if (!searchResults || !searchResults.items || searchResults.items.length === 0) {
                return interaction.respond([{ name: "Nenhum resultado encontrado", value: "no_results" }]);
            }

            const choices = searchResults.items.map(result => ({
                name: `${result.title} - ${result.channelTitle}`.slice(0, 100),
                value: result.id
            }));
            await interaction.respond(choices);
        } catch (error) {
            console.error('Erro ao buscar resultados do autocomplete:', error);
            await interaction.respond([{ name: "Erro ao buscar resultados", value: "error" }]);
        }
    },
    run: async (client, interaction) => {
        await interaction.deferReply();

        const query = interaction.options.getString('query');
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            const noVoiceEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription('Você precisa estar em um canal de voz para usar este comando!');
            return interaction.editReply({ embeds: [noVoiceEmbed], ephemeral: true });
        }

        try {
            const resolve = await client.riffy.resolve({ query: query, requester: interaction.user });
            const { loadType, tracks, playlistInfo } = resolve;

            if (loadType === 'empty' || !tracks || tracks.length === 0) {
                const notFoundEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('Nenhum resultado encontrado')
                    .setDescription(`Não foram encontrados resultados para: "${query}"`)
                    .setFooter({ text: `Solicitado por ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

                return interaction.editReply({ embeds: [notFoundEmbed] });
            }

            const player = client.riffy.createConnection({
                guildId: interaction.guild.id,
                voiceChannel: voiceChannel.id,
                textChannel: interaction.channel.id,
                deaf: true 
            });

            let embed;
            if (loadType === 'playlist') {
                for (const track of tracks) {
                    track.info.requester = interaction.user;
                    player.queue.add(track);
                }
                embed = new EmbedBuilder()
                    .setColor('#14bdff')
                    .setTitle('Playlist Adicionada à Fila')
                    .setDescription(`**Nome da Playlist:** ${playlistInfo.name}\n**Número de Faixas:** ${tracks.length}`)
                    .setFooter({ text: `Solicitado por ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });
            } else if (loadType === 'search' || loadType === 'track') {
                const track = tracks[0];
                track.info.requester = interaction.user;
                player.queue.add(track);

                embed = new EmbedBuilder()
                    .setColor('#14bdff')
                    .setTitle('Música Adicionada à Fila')
                    .setDescription(`**${track.info.title}** foi adicionada à fila e está pronta para tocar!`)
                    .setThumbnail(track.info.thumbnail)
                    .addFields(
                        { name: 'Duração', value: formatDuration(track.info.length), inline: true },
                        { name: 'Artista', value: track.info.author, inline: true }
                    )
                    .setFooter({ text: `Solicitado por ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });
            }

            // Delete previous now playing message if it exists
            if (player.nowPlayingMessage) {
                await player.nowPlayingMessage.delete().catch(console.error);
            }

            const row = createMusicControlButtons();

            player.nowPlayingMessage = await interaction.editReply({ embeds: [embed], components: [row] });

            if (!player.playing && !player.paused) player.play();

            player.inactivityTimeout = setTimeout(() => checkInactivity(player, interaction), 60000);
        } catch (error) {
            console.error('Erro ao processar o comando de play:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Erro ao processar o comando')
                .setDescription('Ocorreu um erro ao tentar tocar a música. Por favor, tente novamente.')
                .setFooter({ text: `Solicitado por ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

            return interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};

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

    return `${hours > 0 ? `${hours}:` : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function checkInactivity(player, interaction) {
    const voiceChannel = interaction.guild.channels.cache.get(player.voiceChannel);
    if (voiceChannel && voiceChannel.members.size === 1) {
        player.destroy();
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('Inatividade Detectada')
            .setDescription('Saí do canal de voz devido à inatividade.')
            .setFooter({ text: 'Música Encerrada', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        interaction.channel.send({ embeds: [embed] }).catch(console.error);
    } else {
        player.inactivityTimeout = setTimeout(() => checkInactivity(player, interaction), 60000);
    }
}