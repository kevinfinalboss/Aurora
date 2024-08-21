const { Client, CommandInteraction, ModalBuilder, TextInputBuilder, ActionRowBuilder, EmbedBuilder } = require("discord.js");
const { TextInputStyle } = require('discord.js');

module.exports = {
    name: "imc",
    description: "Calcular o Índice de Massa Corporal (IMC)",

    /**
     * 
     * @param {Client} client 
     * @param {CommandInteraction} interaction 
     */

    run: async (client, interaction) => {
        const modal = new ModalBuilder()
            .setCustomId('imcModal')
            .setTitle('Calculadora de IMC');

        const alturaInput = new TextInputBuilder()
            .setCustomId('altura')
            .setLabel('Altura (em metros, ex: 1.75)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const pesoInput = new TextInputBuilder()
            .setCustomId('peso')
            .setLabel('Peso (em kg, ex: 70)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(alturaInput);
        const secondActionRow = new ActionRowBuilder().addComponents(pesoInput);

        modal.addComponents(firstActionRow, secondActionRow);

        await interaction.showModal(modal);

        try {
            const submitted = await interaction.awaitModalSubmit({
                time: 60000,
                filter: i => i.customId === 'imcModal' && i.user.id === interaction.user.id,
            });

            if (submitted) {
                const altura = parseFloat(submitted.fields.getTextInputValue('altura'));
                const peso = parseFloat(submitted.fields.getTextInputValue('peso'));

                if (isNaN(altura) || isNaN(peso) || altura <= 0 || peso <= 0) {
                    await submitted.reply({
                        content: 'Por favor, insira valores válidos para altura e peso.',
                        ephemeral: true
                    });
                    return;
                }

                const imc = peso / (altura * altura);
                let resultado, cor;

                if (imc < 18.5) {
                    resultado = "Abaixo do peso";
                    cor = '#87CEEB';
                } else if (imc < 25) {
                    resultado = "Peso normal";
                    cor = '#32CD32';
                } else if (imc < 30) {
                    resultado = "Sobrepeso";
                    cor = '#FFA500';
                } else {
                    resultado = "Obeso";
                    cor = '#FF4500';
                }

                const embed = new EmbedBuilder()
                    .setColor(cor)
                    .setTitle('Resultado do IMC')
                    .addFields(
                        { name: 'Seu IMC', value: imc.toFixed(2).toString(), inline: true },
                        { name: 'Classificação', value: resultado, inline: true }
                    )
                    .addFields(
                        { name: 'Altura', value: `${altura.toFixed(2)}m`, inline: true },
                        { name: 'Peso', value: `${peso.toFixed(1)}kg`, inline: true }
                    )
                    .setFooter({ text: 'Lembre-se: o IMC é apenas um indicador. Consulte um profissional de saúde para uma avaliação completa.' })
                    .setTimestamp();

                await submitted.reply({ embeds: [embed], ephemeral: true });
            }
        } catch (error) {
            console.error('Erro ao processar o modal de IMC:', error);
            await interaction.followUp({
                content: 'Ocorreu um erro ao processar o comando. Por favor, tente novamente mais tarde.',
                ephemeral: true
            });
        }
    }
};