const { CommandInteraction, ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");
const Groq = require("groq-sdk");
const dotenv = require('dotenv');

dotenv.config();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

module.exports = {
    name: "ai",
    description: "Gera uma resposta usando o modelo llama3-70b-8192 via Aurora - IA.",
    options: [
        {
            name: "prompt",
            description: "O prompt para o modelo de IA.",
            type: ApplicationCommandOptionType.String,
            required: true
        }
    ],

    /**
     * 
     * @param {Client} client 
     * @param {CommandInteraction} interaction 
     */

    run: async (client, interaction) => {
        await interaction.deferReply();

        const prompt = interaction.options.getString("prompt");

        try {
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
                model: "llama3-70b-8192",
            });

            const generatedText = chatCompletion.choices[0]?.message?.content || "No response generated.";

            const embed = new EmbedBuilder()
                .setTitle("Aurora - IA")
                .setDescription(generatedText)
                .setColor("#7289DA") 
                .setTimestamp()
                .setFooter({
                    text: `Solicitado por ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                })
                .setThumbnail(client.user.displayAvatarURL());

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(`Erro ao usar a API Groq: ${error.message}`);
            
            const embedErro = new EmbedBuilder()
                .setTitle("Erro na Geração de Resposta")
                .setDescription("Ocorreu um erro ao tentar gerar uma resposta. Por favor, tente novamente mais tarde.")
                .setColor(0xff0000)
                .setThumbnail(client.user.displayAvatarURL())
                .setFooter({
                    text: `Solicitado por ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                });

            return interaction.editReply({ embeds: [embedErro], ephemeral: true });
        }
    }
};
