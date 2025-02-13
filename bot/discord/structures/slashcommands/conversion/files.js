const { CommandInteraction, ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");
const axios = require("axios");
const { Document, Packer, Paragraph, TextRun } = require('docx');
const pdfParse = require('pdf-parse');
const PDFDocument = require('pdfkit');
const mammoth = require('mammoth');

module.exports = {
    name: "converter-doc",
    description: "Converte documentos entre PDF e DOCX",
    options: [
        {
            name: "arquivo",
            description: "Arquivo para converter (PDF ou DOCX)",
            type: ApplicationCommandOptionType.Attachment,
            required: true
        },
        {
            name: "formato",
            description: "Formato de saída desejado",
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                { name: "PDF", value: "pdf" },
                { name: "DOCX", value: "docx" }
            ]
        }
    ],

    run: async (client, interaction) => {
        await interaction.deferReply();

        try {
            const arquivo = interaction.options.getAttachment("arquivo");
            const formatoSaida = interaction.options.getString("formato");
            const tipoEntrada = arquivo.contentType;

            if (!tipoEntrada?.includes("pdf") && !tipoEntrada?.includes("docx") && 
                !tipoEntrada?.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document")) {
                return interaction.editReply("Por favor, envie um arquivo PDF ou DOCX válido.");
            }

            const response = await axios.get(arquivo.url, { responseType: "arraybuffer" });
            let convertido;

            if (tipoEntrada.includes("pdf") && formatoSaida === "docx") {
                // PDF para DOCX
                const pdfData = await pdfParse(response.data);
                const doc = new Document({
                    sections: [{
                        properties: {},
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun(pdfData.text)
                                ],
                            }),
                        ],
                    }],
                });
                convertido = await Packer.toBuffer(doc);
            } else if ((tipoEntrada.includes("docx") || tipoEntrada.includes("word")) && formatoSaida === "pdf") {
                // DOCX para PDF
                const result = await mammoth.extractRawText({ buffer: response.data });
                const doc = new PDFDocument();
                const chunks = [];

                return new Promise((resolve, reject) => {
                    doc.on('data', chunk => chunks.push(chunk));
                    doc.on('end', () => {
                        convertido = Buffer.concat(chunks);
                        resolve(convertido);
                    });

                    doc.font('Helvetica')
                       .fontSize(12)
                       .text(result.value, {
                           align: 'left',
                           lineGap: 5
                       });

                    doc.end();
                });
            } else {
                return interaction.editReply("O arquivo já está no formato solicitado.");
            }

            const embed = new EmbedBuilder()
                .setTitle("Conversão Concluída")
                .setColor("#00ff00")
                .setDescription(`Arquivo convertido de ${tipoEntrada.includes("pdf") ? "PDF" : "DOCX"} para ${formatoSaida.toUpperCase()}`)
                .setTimestamp()
                .setFooter({
                    text: `Solicitado por ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                });

            await interaction.editReply({
                embeds: [embed],
                files: [{
                    attachment: convertido,
                    name: `convertido.${formatoSaida}`
                }]
            });

        } catch (error) {
            console.error(`Erro na conversão: ${error.message}`);
            
            const embedErro = new EmbedBuilder()
                .setTitle("Erro na Conversão")
                .setDescription("Ocorreu um erro ao converter o documento. Por favor, tente novamente.")
                .setColor(0xff0000)
                .setFooter({
                    text: `Solicitado por ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                });

            return interaction.editReply({ embeds: [embedErro] });
        }
    }
};