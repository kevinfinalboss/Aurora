const { CommandInteraction, EmbedBuilder } = require("discord.js");
const axios = require('axios');
const { logger } = require('../../functions/logger');

module.exports = {
    name: "cep",
    description: "Busca informações de um CEP",
    options: [
        {
            name: "cep",
            description: "O CEP que você deseja buscar (ex: 01001000)",
            type: 3,
            required: true,
        },
    ],

    run: async (client, interaction) => {
        const cep = interaction.options.getString('cep');

        try {
            const resposta = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
            const dados = resposta.data;

            if (dados.erro) {
                return interaction.reply({
                    content: "CEP inválido. Por favor, verifique o CEP e tente novamente.",
                    ephemeral: true,
                });
            }

            const embed = new EmbedBuilder()
                .setTitle(`Informações do CEP: ${dados.cep}`)
                .setDescription(`**Endereço:** ${dados.logradouro}, ${dados.bairro}\n**Cidade:** ${dados.localidade} - ${dados.uf}\n**DDD:** ${dados.ddd}`)
                .setColor(0x00AE86)
                .setThumbnail(client.user.displayAvatarURL())
                .setFooter({ text: "Consulta de CEP - ViaCEP" });

            return interaction.reply({ embeds: [embed], ephemeral: false });

        } catch (error) {
            const embedErro = new EmbedBuilder()
                .setTitle("Erro na Busca de CEP")
                .setDescription("Ocorreu um erro ao tentar buscar o CEP. Verifique o CEP e tente novamente.")
                .setColor(0xff0000)
                .setThumbnail(client.user.displayAvatarURL())
                .setFooter({ text: "Consulta de CEP - ViaCEP" });

            logger(`Erro ao buscar CEP ${cep}: ${error.message}`, 'error');

            return interaction.reply({ embeds: [embedErro], ephemeral: true });
        }
    }
};
