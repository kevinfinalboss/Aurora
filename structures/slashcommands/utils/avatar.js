const { Client, CommandInteraction, ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");

module.exports = {
    name: "avatar",
    description: "Exibe o avatar de um usuário.",
    options: [
        {
            name: "usuario",
            description: "O usuário para exibir o avatar.",
            type: ApplicationCommandOptionType.User,
            required: false
        }
    ],

    /**
     * 
     * @param {Client} client 
     * @param {CommandInteraction} interaction 
     */

    run: async (client, interaction) => {
        const user = interaction.options.getUser("usuario") || interaction.user;
        
        const embed = new EmbedBuilder()
            .setTitle(`Avatar de ${user.username}`)
            .setImage(user.displayAvatarURL({ size: 1024, dynamic: true }))
            .setColor("Random")
            .setTimestamp()
            .setFooter({ text: `Solicitado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

        return interaction.reply({ embeds: [embed] });
    }
};