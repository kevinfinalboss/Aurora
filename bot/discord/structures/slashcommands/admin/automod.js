const { Client, CommandInteraction, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

module.exports = {
    name: "automod",
    description: "Configura as opções do AutoMod",
    options: [
        {
            name: "palavras",
            description: "Gerencia a lista de palavras banidas",
            type: 1,
            options: [
                {
                    name: "ação",
                    description: "Adicionar ou remover palavra",
                    type: 3,
                    required: true,
                    choices: [
                        { name: "Adicionar", value: "add" },
                        { name: "Remover", value: "remove" }
                    ]
                },
                {
                    name: "palavra",
                    description: "A palavra para adicionar ou remover",
                    type: 3,
                    required: true
                }
            ]
        },
        {
            name: "mencoes",
            description: "Define o limite de menções",
            type: 1,
            options: [
                {
                    name: "limite",
                    description: "Número máximo de menções permitidas",
                    type: 4,
                    required: true,
                    min_value: 1,
                    max_value: 20
                }
            ]
        }
    ],

    /**
     * 
     * @param {Client} client 
     * @param {CommandInteraction} interaction 
     */

    run: async (client, interaction) => {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: "Você não tem permissão para usar este comando.", ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "palavras") {
            const action = interaction.options.getString("ação");
            const word = interaction.options.getString("palavra").toLowerCase();

            if (!client.bannedWords) {
                client.bannedWords = [];
            }

            if (action === "add") {
                if (client.bannedWords.includes(word)) {
                    return interaction.reply({ content: "Esta palavra já está na lista de palavras banidas.", ephemeral: true });
                }
                client.bannedWords.push(word);
                await interaction.reply({ content: `A palavra "${word}" foi adicionada à lista de palavras banidas.`, ephemeral: true });
            } else if (action === "remove") {
                const index = client.bannedWords.indexOf(word);
                if (index > -1) {
                    client.bannedWords.splice(index, 1);
                    await interaction.reply({ content: `A palavra "${word}" foi removida da lista de palavras banidas.`, ephemeral: true });
                } else {
                    await interaction.reply({ content: "Esta palavra não está na lista de palavras banidas.", ephemeral: true });
                }
            }
        } else if (subcommand === "mencoes") {
            const limit = interaction.options.getInteger("limite");
            client.maxMentions = limit;
            await interaction.reply({ content: `O limite de menções foi definido para ${limit}.`, ephemeral: true });
        }

        const configEmbed = new EmbedBuilder()
            .setColor("#0099ff")
            .setTitle("Configurações Atuais do AutoMod")
            .addFields(
                { name: "Palavras Banidas", value: client.bannedWords.join(", ") || "Nenhuma" },
                { name: "Limite de Menções", value: client.maxMentions.toString() }
            )
            .setTimestamp();

        await interaction.followUp({ embeds: [configEmbed], ephemeral: true });
    }
};