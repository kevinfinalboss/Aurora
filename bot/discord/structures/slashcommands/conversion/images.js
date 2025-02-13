const { CommandInteraction, ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");
const sharp = require("sharp");
const axios = require("axios");
const gifEncoder = require('gif-encoder');
const { Readable } = require('stream');

module.exports = {
    name: "converter-imagem",
    description: "Converte uma imagem WebP animada para GIF",
    options: [
        {
            name: "imagem",
            description: "A imagem WebP para converter",
            type: ApplicationCommandOptionType.Attachment,
            required: true
        }
    ],

    run: async (client, interaction) => {
        await interaction.deferReply();

        try {
            const attachment = interaction.options.getAttachment("imagem");
            
            if (!attachment.contentType?.includes("webp")) {
                return interaction.editReply("Por favor, envie uma imagem no formato WebP.");
            }

            const response = await axios.get(attachment.url, { responseType: "arraybuffer" });
            const metadata = await sharp(response.data).metadata();

            // Se a imagem for animada
            if (metadata.pages && metadata.pages > 1) {
                const frames = await sharp(response.data, { animated: true })
                    .toFormat('gif')
                    .toBuffer();

                const embed = new EmbedBuilder()
                    .setTitle("Conversão Concluída")
                    .setColor("#00ff00")
                    .setTimestamp()
                    .setFooter({
                        text: `Solicitado por ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL()
                    });

                await interaction.editReply({
                    embeds: [embed],
                    files: [{
                        attachment: frames,
                        name: "converted.gif"
                    }]
                });
            } else {
                return interaction.editReply("A imagem WebP não é animada.");
            }

        } catch (error) {
            console.error(`Erro na conversão: ${error.message}`);
            
            const embedErro = new EmbedBuilder()
                .setTitle("Erro na Conversão")
                .setDescription("Ocorreu um erro ao converter a imagem. Por favor, tente novamente.")
                .setColor(0xff0000)
                .setFooter({
                    text: `Solicitado por ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                });

            return interaction.editReply({ embeds: [embedErro] });
        }
    }
};