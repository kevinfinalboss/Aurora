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
            const choices = searchResults.items.map(result => ({
                name: `${result.title} - ${result.channelTitle}`.slice(0, 100),
                value: result.id
            }));
            await interaction.respond(choices);
        } catch (error) {
            console.error('Error fetching autocomplete results:', error);
            await interaction.respond([]);
        }
    },
    run: async (client, interaction) => {
        await interaction.deferReply();

        const query = interaction.options.getString('query');
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            return interaction.editReply({ content: 'Você precisa estar em um canal de voz para usar este comando!', ephemeral: true });
        }

        try {
            const resolve = await client.riffy.resolve({ query: query, requester: interaction.user });
            const { loadType, tracks, playlistInfo } = resolve;

            if (loadType === 'empty') {
                return interaction.editReply('Não foram encontrados resultados para esta busca.');
            }

            const player = client.riffy.createConnection({
                guildId: interaction.guild.id,
                voiceChannel: voiceChannel.id,
                textChannel: interaction.channel.id,
                deaf: true 
            });

            let embed;
            if (loadType === 'playlist') {
                for (const track of resolve.tracks) {
                    track.info.requester = interaction.user;
                    player.queue.add(track);
                }
                embed = new EmbedBuilder()
                    .setAuthor({
                        name: 'Playlist Adicionada à Fila',
                        iconURL: 'https://cdn.discordapp.com/attachments/1156866389819281418/1157218651179597884/1213-verified.gif?ex=6517cf5a&is=65167dda&hm=cf7bc8fb4414cb412587ade0af285b77569d2568214d6baab8702ddeb6c38ad5&', 
                        url: 'https://discord.gg/xQF9f9yUEM'
                    })
                    .setDescription(`**Nome da Playlist:** ${playlistInfo.name}\n**Número de Faixas:** ${tracks.length}`)
                    .setColor('#14bdff')
                    .setFooter({ text: `Solicitado por ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });
            } else if (loadType === 'search' || loadType === 'track') {
                const track = tracks.shift();
                track.info.requester = interaction.user;
                player.queue.add(track);

                embed = new EmbedBuilder()
                    .setAuthor({
                        name: 'Música Adicionada à Fila',
                        iconURL: 'https://cdn.discordapp.com/attachments/1156866389819281418/1157218651179597884/1213-verified.gif?ex=6517cf5a&is=65167dda&hm=cf7bc8fb4414cb412587ade0af285b77569d2568214d6baab8702ddeb6c38ad5&', 
                        url: 'https://discord.gg/xQF9f9yUEM'
                    })
                    .setDescription(`**${track.info.title}** foi adicionada à fila e está pronta para tocar!`)
                    .setColor('#14bdff')
                    .setThumbnail(track.info.thumbnail)
                    .addFields(
                        { name: 'Duração', value: formatDuration(track.info.length), inline: true },
                        { name: 'Artista', value: track.info.author, inline: true }
                    )
                    .setFooter({ text: `Solicitado por ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });
            }

            const row = createMusicControlButtons();

            const messages = await interaction.channel.messages.fetch({ limit: 10 });
            const botMessages = messages.filter(msg => msg.author.id === client.user.id && msg.embeds.length > 0);
            await interaction.channel.bulkDelete(botMessages);

            await interaction.editReply({ embeds: [embed], components: [row] });

            if (!player.playing && !player.paused) return player.play();

            player.inactivityTimeout = setTimeout(() => checkInactivity(player, interaction), 60000);
        } catch (error) {
            console.error(error);
            return interaction.editReply('Ocorreu um erro ao tentar tocar a música. Por favor, tente novamente.');
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
            .setAuthor({
                name: 'Inatividade Detectada',
                iconURL: client.user.displayAvatarURL()
            })
            .setDescription('Saí do canal de voz devido à inatividade.')
            .setThumbnail(client.user.displayAvatarURL())
            .setFooter({ text: 'Música Encerrada', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        interaction.channel.send({ embeds: [embed] });
    } else {
        player.inactivityTimeout = setTimeout(() => checkInactivity(player, interaction), 15000);
    }
}