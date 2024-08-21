const { Client, CommandInteraction, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require("discord.js");

module.exports = {
    name: "imc",
    description: "Calcular o Índice de Massa Corporal (IMC)",

    /**
     * 
     * @param {Client} client 
     * @param {CommandInteraction} interaction 
     */

    run: async (client, interaction) => {
        const alturaOptions = [
            { label: 'Menos de 1,50m', value: '1.45' },
            { label: '1,50m - 1,60m', value: '1.55' },
            { label: '1,61m - 1,70m', value: '1.65' },
            { label: '1,71m - 1,80m', value: '1.75' },
            { label: '1,81m - 1,90m', value: '1.85' },
            { label: 'Mais de 1,90m', value: '1.95' }
        ];

        const pesoOptions = [
            { label: 'Menos de 50kg', value: '45' },
            { label: '50kg - 60kg', value: '55' },
            { label: '61kg - 70kg', value: '65' },
            { label: '71kg - 80kg', value: '75' },
            { label: '81kg - 90kg', value: '85' },
            { label: '91kg - 100kg', value: '95' },
            { label: 'Mais de 100kg', value: '105' }
        ];

        const alturaRow = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('altura')
                    .setPlaceholder('Selecione sua altura')
                    .addOptions(alturaOptions)
            );

        const pesoRow = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('peso')
                    .setPlaceholder('Selecione seu peso')
                    .addOptions(pesoOptions)
            );

        await interaction.reply({
            content: 'Por favor, selecione sua altura e peso para calcular o IMC:',
            components: [alturaRow, pesoRow],
            ephemeral: true
        });

        try {
            const collector = interaction.channel.createMessageComponentCollector({ 
                filter: i => i.user.id === interaction.user.id,
                time: 60000,
                componentType: ComponentType.StringSelect
            });

            let altura, peso;

            collector.on('collect', async i => {
                await i.deferUpdate();
                if (i.customId === 'altura') {
                    altura = parseFloat(i.values[0]);
                    await i.editReply({ content: 'Altura selecionada. Agora selecione seu peso.' });
                } else if (i.customId === 'peso') {
                    peso = parseFloat(i.values[0]);
                    collector.stop();
                }
            });

            collector.on('end', async collected => {
                if (altura && peso) {
                    const imc = peso / (altura * altura);
                    let resultado;

                    if (imc < 18.5) resultado = "Abaixo do peso";
                    else if (imc < 25) resultado = "Peso normal";
                    else if (imc < 30) resultado = "Sobrepeso";
                    else resultado = "Obeso";

                    await interaction.editReply({
                        content: `Seu IMC é ${imc.toFixed(2)}. Classificação: ${resultado}`,
                        components: []
                    });
                } else {
                    await interaction.editReply({
                        content: 'Tempo esgotado ou informações incompletas. Por favor, tente novamente.',
                        components: []
                    });
                }
            });
        } catch (error) {
            console.error('Erro ao processar o comando IMC:', error);
            await interaction.editReply({
                content: 'Ocorreu um erro ao processar o comando. Por favor, tente novamente mais tarde.',
                components: []
            });
        }
    }
};