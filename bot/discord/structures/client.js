const { readdirSync } = require("fs");
const { REST, Routes, Client, Collection, EmbedBuilder } = require('discord.js');
const { loadConfig } = require("./configuration/index");
const { logger } = require("./functions/logger");
const path = require("path");

async function initializeClient() {
    const chalk = (await import('chalk')).default;
    const Table = (await import('cli-table3')).default;

    const config = await loadConfig();

    const { client_id, client_token } = config;

    if (!client_id || !client_token) {
        logger("Client ID ou Token não encontrados nas configurações.", "error");
        return process.exit(1);
    }

    const client = new Client({
        intents: [
            "Guilds",
            "GuildMembers",
            "GuildMessages",
            "MessageContent"
        ]
    });

    client.commands = new Collection();
    client.aliases = new Collection();
    client.slashCommands = new Collection();

    client.bannedWords = ['palavrão1', 'palavrão2', 'spam'];
    client.maxMentions = 5;

    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;

        const containsBannedWord = client.bannedWords.some(word => message.content.toLowerCase().includes(word));
        const mentionCount = message.mentions.users.size + message.mentions.roles.size;

        if (containsBannedWord || mentionCount > client.maxMentions) {
            await message.delete();

            const warningEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Aviso de AutoMod')
                .setDescription(`Sua mensagem foi removida por violar as regras.`)
                .addFields(
                    { name: 'Motivo', value: containsBannedWord ? 'Uso de linguagem proibida' : 'Excesso de menções' },
                    { name: 'Ação', value: 'Mensagem deletada' }
                )
                .setTimestamp();

            try {
                await message.author.send({ embeds: [warningEmbed] });
                logger(`Aviso de AutoMod enviado para ${message.author.tag}`, "info");
            } catch (error) {
                logger(`Não foi possível enviar DM para ${message.author.tag}`, "warn");
            }

            const modChannel = message.guild.channels.cache.find(channel => channel.name === 'mod-logs');
            if (modChannel) {
                modChannel.send({ embeds: [warningEmbed] });
                logger(`Log de AutoMod enviado para o canal ${modChannel.name}`, "info");
            }
        }
    });

    console.log(chalk.blue("Iniciando carregamento de comandos, eventos e slash commands..."));
    await load_commands(client, chalk, Table);
    await load_events(client, chalk, Table);
    await load_slash_commands(client, client_id, client_token, chalk, Table);
    console.log(chalk.green("Carregamento de comandos, eventos e slash commands concluído."));

    console.log(chalk.blue("Iniciando login do bot..."));
    await client.login(client_token);
    console.log(chalk.green(`Bot logado com sucesso como ${client.user.tag}`));

    process.on('unhandledRejection', error => {
        logger("Ocorreu um erro de rejeição não tratada.", "error");
        console.error(chalk.red(`[REJEIÇÃO NÃO TRATADA] ${new Date().toISOString()} - ${error.message}`));
        console.error(error);
    });

    process.on('uncaughtException', error => {
        logger("Ocorreu uma exceção não capturada.", "error");
        console.error(chalk.red(`[EXCEÇÃO NÃO CAPTURADA] ${new Date().toISOString()} - ${error.message}`));
        console.error(error);
        process.exit(1);
    });

    return client;
}

async function load_commands(client, chalk, Table) {
    console.log(chalk.blue("\n---------------------"));
    logger("INICIANDO CARREGAMENTO DE COMANDOS", "debug");

    const commandsPath = path.join(__dirname, "commands");
    readdirSync(commandsPath).forEach(dir => {
        const dirPath = path.join(commandsPath, dir);
        const commands = readdirSync(dirPath).filter(file => file.endsWith('.js'));

        const commandTable = new Table({
            head: ['Nome do Comando', 'Status'],
            colWidths: [30, 20],
            style: { head: ['cyan'] }
        });

        for (const file of commands) {
            const filePath = path.join(dirPath, file);
            const pull = require(filePath);

            try {
                if (!pull.name || !pull.description) {
                    logger(`Faltando nome, descrição ou função run no comando ${file}.`, "error");
                    commandTable.push([file, chalk.red('Erro')]);
                    continue;
                }

                pull.category = dir;
                client.commands.set(pull.name, pull);

                logger(`[COMANDOS] ${pull.name} - Carregado com sucesso.`, "info");
                commandTable.push([pull.name, chalk.green('Carregado')]);
            } catch (err) {
                logger(`Não foi possível carregar o comando ${file}, erro: ${err.message}`, "error");
                commandTable.push([file, chalk.red('Erro')]);
                continue;
            }

            if (pull.aliases && Array.isArray(pull.aliases)) {
                pull.aliases.forEach(alias => client.aliases.set(alias, pull.name));
            }
        }

        console.log(commandTable.toString());
    });

    console.log(chalk.blue("---------------------"));
}

async function load_events(client, chalk, Table) {
    console.log(chalk.blue("\n---------------------"));
    logger("INICIANDO CARREGAMENTO DE EVENTOS", "debug");

    const eventsPath = path.join(__dirname, "events");
    const eventTable = new Table({
        head: ['Nome do Evento', 'Status'],
        colWidths: [30, 20],
        style: { head: ['cyan'] }
    });

    readdirSync(eventsPath).forEach(dir => {
        const dirPath = path.join(eventsPath, dir);
        const events = readdirSync(dirPath).filter(file => file.endsWith('.js'));

        for (const file of events) {
            const filePath = path.join(dirPath, file);
            const event = require(filePath);

            try {
                if (typeof event.execute !== 'function') {
                    logger(`Não foi possível carregar o evento ${file}, erro: A função execute não foi encontrada.`, "error");
                    eventTable.push([file, chalk.red('Erro')]);
                    continue;
                }

                const eventName = event.name || file.replace('.js', '');

                client.on(eventName, (...args) => event.execute(client, ...args));

                logger(`[EVENTOS] ${eventName} - Carregado com sucesso.`, "info");
                eventTable.push([eventName, chalk.green('Carregado')]);
            } catch (err) {
                logger(`Não foi possível carregar o evento ${file}, erro: ${err.message}`, "error");
                eventTable.push([file, chalk.red('Erro')]);
                continue;
            }
        }
    });

    console.log(eventTable.toString());
    console.log(chalk.blue("---------------------"));
}

async function load_slash_commands(client, client_id, client_token, chalk, Table) {
    console.log(chalk.blue("\n---------------------"));
    logger("INICIANDO CARREGAMENTO DE SLASH COMMANDS", "debug");

    const slashCommandsPath = path.join(__dirname, "slashcommands");
    const slash = [];
    const slashTable = new Table({
        head: ['Nome do Slash Command', 'Status'],
        colWidths: [30, 20],
        style: { head: ['cyan'] }
    });

    readdirSync(slashCommandsPath).forEach(dir => {
        const dirPath = path.join(slashCommandsPath, dir);
        const commands = readdirSync(dirPath).filter(file => file.endsWith('.js'));

        for (const file of commands) {
            const filePath = path.join(dirPath, file);
            const pull = require(filePath);

            try {
                if (!pull.name || !pull.description) {
                    logger(`Faltando nome, descrição ou função run no slash command ${file}.`, "error");
                    slashTable.push([file, chalk.red('Erro')]);
                    continue;
                }

                const data = {};
                for (const key in pull) {
                    data[key.toLowerCase()] = pull[key];
                }

                slash.push(data);

                pull.category = dir;
                client.slashCommands.set(pull.name, pull);

                logger(`[SLASH] ${pull.name} - Carregado com sucesso.`, "info");
                slashTable.push([pull.name, chalk.green('Carregado')]);
            } catch (err) {
                logger(`Não foi possível carregar o slash command ${file}, erro: ${err.message}`, "error");
                slashTable.push([file, chalk.red('Erro')]);
                continue;
            }
        }
    });

    console.log(slashTable.toString());
    console.log(chalk.blue("---------------------"));

    const rest = new REST({ version: '10' }).setToken(client_token);

    try {
        console.log(chalk.blue("Iniciando registro de comandos de aplicação..."));
        await rest.put(Routes.applicationCommands(client_id), { body: slash });
        console.log(chalk.green("Comandos de aplicação registrados com sucesso."));
    } catch (error) {
        logger("Não foi possível registrar os comandos de aplicação.", "error");
        console.error(chalk.red(`[ERRO] ${new Date().toISOString()} - ${error.message}`));
    }
}

module.exports = initializeClient;