const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const QRCode = require("qrcode");

module.exports = {
    name: "qrcode",
    description: "Gera um QR code para um link fornecido.",
    options: [
        {
            name: "link",
            type: 3,
            description: "O link para o qual o QR code deve apontar.",
            required: true
        }
    ],

    run: async (client, interaction) => {
        const link = interaction.options.getString("link");

        try {
            const qrCodeBuffer = await QRCode.toBuffer(link);
            const qrCodeAttachment = new AttachmentBuilder(qrCodeBuffer, { name: 'qrcode.png' });

            const embed = new EmbedBuilder()
                .setTitle("QR Code Gerado")
                .setDescription(`Aqui está o QR code para o link fornecido.\n[Clique aqui para acessar o link diretamente](${link})`)
                .setImage('attachment://qrcode.png')
                .setColor("#00FF00")
                .setFooter({ text: "Gerado por Aurora Bot", iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            return interaction.reply({ embeds: [embed], files: [qrCodeAttachment], ephemeral: true });

        } catch (error) {
            console.error(error);
            return interaction.reply({ content: "Ocorreu um erro ao gerar o QR code. Por favor, tente novamente.", ephemeral: true });
        }
    }
};
