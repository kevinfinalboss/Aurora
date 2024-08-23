const { ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');
const { createWorker } = require('tesseract.js');
const axios = require('axios');

module.exports = {
    name: 'ocr',
    description: 'Realiza OCR em uma imagem anexada ou através de um link',
    options: [
        {
            name: 'imagem',
            type: ApplicationCommandOptionType.Attachment,
            description: 'A imagem para realizar OCR',
            required: false
        },
        {
            name: 'link',
            type: ApplicationCommandOptionType.String,
            description: 'Link da imagem para realizar OCR',
            required: false
        }
    ],
    
    async run(client, interaction) {
        await interaction.deferReply();

        let imageUrl;
        const attachment = interaction.options.getAttachment('imagem');
        const link = interaction.options.getString('link');

        if (attachment) {
            imageUrl = attachment.url;
        } else if (link) {
            imageUrl = link;
        } else {
            const errorEmbed = createErrorEmbed(client, 'Por favor, forneça uma imagem anexada ou um link para a imagem.');
            return interaction.editReply({ embeds: [errorEmbed] });
        }

        try {
            const imageBuffer = await downloadImage(imageUrl);
            const text = await performOCR(imageBuffer);

            if (text.trim().length === 0) {
                const noTextEmbed = createErrorEmbed(client, 'Não foi possível detectar texto nesta imagem.');
                return interaction.editReply({ embeds: [noTextEmbed] });
            }

            const resultEmbed = new EmbedBuilder()
                .setColor('#00A859')
                .setTitle('📝 Resultado do Reconhecimento de Texto')
                .setDescription(text.length > 4096 ? text.slice(0, 4093) + '...' : text)
                .addFields(
                    { name: '📊 Estatísticas', value: `Caracteres: ${text.length}\nPalavras: ${text.split(/\s+/).length}` }
                )
                .setTimestamp()
                .setThumbnail(imageUrl)
                .setFooter({ 
                    text: `Solicitado por ${interaction.user.tag}`, 
                    iconURL: client.user.displayAvatarURL()
                });

            await interaction.editReply({ embeds: [resultEmbed] });
        } catch (error) {
            console.error('Erro ao realizar OCR:', error);
            const errorEmbed = createErrorEmbed(client, 'Ocorreu um erro ao processar a imagem. Por favor, tente novamente.');
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};

function createErrorEmbed(client, message) {
    return new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Erro')
        .setDescription(message)
        .setTimestamp()
        .setFooter({ 
            text: 'Tente novamente ou contate o suporte se o problema persistir',
            iconURL: client.user.displayAvatarURL()
        });
}

async function downloadImage(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data, 'binary');
}

async function performOCR(imageBuffer) {
    const worker = await createWorker();
    await worker.loadLanguage('por');
    await worker.initialize('por');
    const { data: { text } } = await worker.recognize(imageBuffer);
    await worker.terminate();
    return text;
}