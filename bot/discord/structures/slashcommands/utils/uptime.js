const { CommandInteraction, EmbedBuilder } = require("discord.js");
const moment = require("moment-timezone");

module.exports = {
    name: "uptime",
    description: "Mostra o tempo de atividade do bot, timezone de São Paulo e o ping.",
    
    /**
     * 
     * @param {Client} client 
     * @param {CommandInteraction} interaction 
     */

    run: async (client, interaction) => {
        await interaction.deferReply();

        const totalSeconds = (client.uptime / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor(totalSeconds / 3600) % 24;
        const minutes = Math.floor(totalSeconds / 60) % 60;
        const uptime = `${days} dias, ${hours} horas e ${minutes} minutos`;

        const timezone = moment().tz("America/Sao_Paulo").format("dddd, DD MMMM YYYY, HH:mm:ss [GMT]Z");

        const ping = Math.round(client.ws.ping);

        const embed = new EmbedBuilder()
            .setTitle("Status do Bot")
            .setColor("#00FF00")
            .addFields(
                { name: "⏰ Uptime", value: uptime, inline: true },
                { name: "🌍 Timezone Atual (São Paulo)", value: timezone, inline: true },
                { name: "📡 Ping", value: `${ping}ms`, inline: true }
            )
            .setTimestamp()
            .setFooter({
                text: `Solicitado por ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setThumbnail(client.user.displayAvatarURL());

        return interaction.editReply({ embeds: [embed] });
    }
};
