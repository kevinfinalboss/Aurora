const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Classic } = require("musicard");
const fs = require("fs");

function setupRiffyEvents(client) {
    client.riffy.on("nodeConnect", node => {
        console.log(`Node "${node.name}" connected.`)
    });

    client.riffy.on("nodeError", (node, error) => {
        console.log(`Node "${node.name}" encountered an error: ${error.message}.`)
    });

    client.riffy.on("trackStart", async (player, track) => {
        const musicard = await Classic({
            thumbnailImage: track.info.thumbnail,
            backgroundColor: "#070707",
            backgroundImage: "https://cdn.discordapp.com/attachments/1220001571228880917/1220001571690123284/01.png?ex=660d5a01&is=65fae501&hm=a8cfb44844e61aa0fd01767cd363af048df28966c30d7b04a59f27fa45cf69c4&",
            nameColor: "#FF7A00",
            progressColor: "#FF7A00",
            progressBarColor: "#5F2D00",
            progress: 50,
            name: track.info.title,
            author: `By ${track.info.author}`,
            authorColor: "#696969",
            startTime: "0:00",
            endTime: formatDuration(track.info.length),
            timeColor: "#FF7A00"
        });

        fs.writeFileSync("musicard.png", musicard);

        const requester = track.info.requester;
        const details = `**Title:** ${track.info.title}\n` +
        `**Author:** ${track.info.author}\n` +
        `**Duration:** ${formatDuration(track.info.length)}\n` +
        `**Requested by:** ${requester.username}`;

        const musicEmbed = new EmbedBuilder()
            .setColor("#FF7A00")
            .setAuthor({
                name: 'Currently playing',
                iconURL: 'https://cdn.discordapp.com/attachments/1140841446228897932/1144671132948103208/giphy.gif', 
                url: 'https://discord.gg/xQF9f9yUEM'
            })
            .setDescription(details)
            .setImage("attachment://musicard.png")
            .setFooter({ text: `Requested by ${requester.username}`, iconURL: requester.displayAvatarURL() });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('pause_resume')
                    .setLabel('Pause/Resume')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('skip')
                    .setLabel('Skip')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('stop')
                    .setLabel('Stop')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('queue')
                    .setLabel('View Queue')
                    .setStyle(ButtonStyle.Success)
            );

        const channel = client.channels.cache.get(player.textChannel);
        
        // Delete previous embeds in the channel
        const messages = await channel.messages.fetch({ limit: 10 });
        const botMessages = messages.filter(msg => msg.author.id === client.user.id && msg.embeds.length > 0);
        await channel.bulkDelete(botMessages);

        await channel.send({ embeds: [musicEmbed], components: [row], files: ["musicard.png"] });

        // Reset inactivity timer
        clearTimeout(player.inactivityTimeout);
        player.inactivityTimeout = setTimeout(() => checkInactivity(player, channel), 60000);
    });

    client.riffy.on("queueEnd", async (player) => {
        const channel = client.channels.cache.get(player.textChannel);
        player.destroy();
        const embed = new EmbedBuilder()
            .setColor('#ffff00')
            .setAuthor({
                name: 'Queue Ended!',
                iconURL: 'https://cdn.discordapp.com/attachments/1230824451990622299/1230824519220985896/6280-2.gif?ex=6641e8a8&is=66409728&hm=149efc9db2a92eb90c70f0a6fb15618a5b912b528f6b1dcf1b517c77a72a733a&',
                url: 'https://discord.gg/xQF9f9yUEM'
            })
            .setDescription('**Bye Bye!, No more songs to play...**');
        await channel.send({ embeds: [embed] });
    });
}

function formatDuration(duration) {
    const seconds = Math.floor((duration / 1000) % 60);
    const minutes = Math.floor((duration / (1000 * 60)) % 60);
    const hours = Math.floor(duration / (1000 * 60 * 60));

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function checkInactivity(player, channel) {
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
            .setFooter({ text: 'Música Encerrada', iconURL: channel.client.user.displayAvatarURL() })
            .setTimestamp();

        channel.send({ embeds: [embed] });
    } else {
        player.inactivityTimeout = setTimeout(() => checkInactivity(player, channel), 60000);
    }
}

module.exports = { setupRiffyEvents };