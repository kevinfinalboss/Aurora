const { Client, CommandInteraction, ApplicationCommandOptionType, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: "clear",
    description: "Apaga uma quantidade específica de mensagens do canal",
    options: [
        {
            name: "quantidade",
            description: "Número de mensagens a serem apagadas (entre 1 e 100)",
            type: ApplicationCommandOptionType.Integer,
            required: true,
            minValue: 1,
            maxValue: 100
        }
    ],
    defaultMemberPermissions: PermissionFlagsBits.Administrator.toString(),

    /**
     * 
     * @param {Client} client 
     * @param {CommandInteraction} interaction 
     */

    run: async (client, interaction) => {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: "Você não tem permissão para usar este comando. Apenas administradores podem executar esta ação.",
                ephemeral: true
            });
        }

        const amount = interaction.options.getInteger("quantidade");

        try {
            await interaction.deferReply({ ephemeral: true });

            const messages = await interaction.channel.messages.fetch({ limit: amount });
            const deletedMessages = await interaction.channel.bulkDelete(messages, true);

            const embed = new EmbedBuilder()
                .setTitle("🧹 Limpeza de Mensagens")
                .setColor("#00FF00")
                .setDescription(`Operação de limpeza concluída com sucesso.`)
                .addFields(
                    { name: "Mensagens Apagadas", value: `${deletedMessages.size}`, inline: true },
                    { name: "Solicitado por", value: `${interaction.user.tag}`, inline: true },
                    { name: "Canal", value: `${interaction.channel.name}`, inline: true }
                )
                .setFooter({ text: `ID do Executor: ${interaction.user.id}` })
                .setTimestamp();

            if (deletedMessages.size < amount) {
                embed.addFields({
                    name: "Observação",
                    value: `Apenas ${deletedMessages.size} mensagens puderam ser apagadas. Mensagens com mais de 14 dias não podem ser excluídas em massa.`
                });
            }

            await interaction.editReply({ embeds: [embed] });

            const publicEmbed = new EmbedBuilder()
                .setTitle("🧹 Limpeza de Mensagens Realizada")
                .setColor("#00FF00")
                .setDescription(`${interaction.user.tag} apagou ${deletedMessages.size} mensagens neste canal.`)
                .setTimestamp();

            await interaction.channel.send({ embeds: [publicEmbed] });

        } catch (error) {
            console.error("Erro ao executar o comando clear:", error);
            await interaction.editReply({
                content: "Ocorreu um erro ao tentar apagar as mensagens. Por favor, tente novamente mais tarde.",
                ephemeral: true
            });
        }
    }
};