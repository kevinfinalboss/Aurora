const { readdirSync } = require("fs");
const { REST, Routes, Client, Collection, EmbedBuilder } = require('discord.js');
const { client_id, client_token } = require("./configuration/index");
const { logger } = require("./functions/logger");

(async () => {
    const { default: chalk } = await import('chalk');
    const { default: Table } = await import('cli-table3');

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
            } catch (error) {
                logger(`Não foi possível enviar DM para ${message.author.tag}`, "warn");
            }

            const modChannel = message.guild.channels.cache.find(channel => channel.name === 'mod-logs');
            if (modChannel) {
                modChannel.send({ embeds: [warningEmbed] });
            }
        }
    });

    module.exports = client;

    await load_commands();
    await load_events();
    await load_slash_commands();

    client.login(client_token).catch((error) => {
        logger("Couldn't login to the bot. Please check the config file.", "error");
        console.error(chalk.red(`[ERROR] ${new Date().toISOString()} - ${error.message}`));
        process.exit(1);
    });

    process.on('unhandledRejection', error => {
        logger("An unhandled rejection error occurred.", "error");
        console.error(chalk.red(`[UNHANDLED REJECTION] ${new Date().toISOString()} - ${error.message}`));
    });

    process.on('uncaughtException', error => {
        logger("An uncaught exception error occurred.", "error");
        console.error(chalk.red(`[UNCAUGHT EXCEPTION] ${new Date().toISOString()} - ${error.message}`));
        process.exit(1);
    });

    async function load_commands() {
        console.log(chalk.blue("\n---------------------"));
        logger("INITIATING COMMANDS", "debug");

        readdirSync('./structures/commands/').forEach(dir => {
            const commands = readdirSync(`./structures/commands/${dir}`).filter(file => file.endsWith('.js'));

            const commandTable = new Table({
                head: ['Command Name', 'Status'],
                colWidths: [30, 20],
                style: { head: ['cyan'] }
            });

            for (const file of commands) {
                const pull = require(`./commands/${dir}/${file}`);

                try {
                    if (!pull.name || !pull.description) {
                        logger(`Missing a name, description or run function in ${file} command.`, "error");
                        commandTable.push([file, chalk.red('Error')]);
                        continue;
                    }

                    pull.category = dir;
                    client.commands.set(pull.name, pull);

                    logger(`[COMMANDS] ${pull.name} - Successfully loaded.`, "info");
                    commandTable.push([pull.name, chalk.green('Loaded')]);
                } catch (err) {
                    logger(`Couldn't load the command ${file}, error: ${err.message}`, "error");
                    commandTable.push([file, chalk.red('Error')]);
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

    async function load_events() {
        console.log(chalk.blue("\n---------------------"));
        logger("INITIATING EVENTS", "debug");

        const eventTable = new Table({
            head: ['Event Name', 'Status'],
            colWidths: [30, 20],
            style: { head: ['cyan'] }
        });

        readdirSync('./structures/events/').forEach(async (dir) => {
            const events = readdirSync(`./structures/events/${dir}`).filter((file) => file.endsWith(".js"));

            for (const file of events) {
                const pull = require(`./events/${dir}/${file}`);

                try {
                    if (pull.name && typeof pull.name !== 'string') {
                        logger(`Couldn't load the event ${file}, error: Property event should be string.`, "error");
                        eventTable.push([file, chalk.red('Error')]);
                        continue;
                    }

                    pull.name = pull.name || file.replace('.js', '');

                    logger(`[EVENTS] ${pull.name} - Successfully loaded.`, "info");
                    eventTable.push([pull.name, chalk.green('Loaded')]);
                } catch (err) {
                    logger(`Couldn't load the event ${file}, error: ${err.message}`, "error");
                    eventTable.push([file, chalk.red('Error')]);
                    continue;
                }
            }
        });

        console.log(eventTable.toString());
        console.log(chalk.blue("---------------------"));
    }

    async function load_slash_commands() {
        console.log(chalk.blue("\n---------------------"));
        logger("INITIATING SLASH COMMANDS", "debug");

        const slash = [];
        const slashTable = new Table({
            head: ['Slash Command Name', 'Status'],
            colWidths: [30, 20],
            style: { head: ['cyan'] }
        });

        readdirSync('./structures/slashcommands/').forEach(async (dir) => {
            const commands = readdirSync(`./structures/slashcommands/${dir}`).filter((file) => file.endsWith(".js"));

            for (const file of commands) {
                const pull = require(`./slashcommands/${dir}/${file}`);

                try {
                    if (!pull.name || !pull.description) {
                        logger(`Missing a name, description or run function in ${file} slash command.`, "error");
                        slashTable.push([file, chalk.red('Error')]);
                        continue;
                    }

                    const data = {};
                    for (const key in pull) {
                        data[key.toLowerCase()] = pull[key];
                    }

                    slash.push(data);

                    pull.category = dir;
                    client.slashCommands.set(pull.name, pull);

                    logger(`[SLASH] ${pull.name} - Successfully loaded.`, "info");
                    slashTable.push([pull.name, chalk.green('Loaded')]);
                } catch (err) {
                    logger(`Couldn't load the slash command ${file}, error: ${err.message}`, "error");
                    slashTable.push([file, chalk.red('Error')]);
                    continue;
                }
            }
        });

        console.log(slashTable.toString());
        console.log(chalk.blue("---------------------"));

        if (!client_id) {
            logger("Couldn't find the client ID in the config file.", "error");
            return process.exit(1);
        }

        const rest = new REST({ version: '10' }).setToken(client_token);

        try {
            await rest.put(Routes.applicationCommands(client_id), { body: slash }).then(() => {
                console.log(chalk.blue("\n---------------------"));
                logger("Successfully registered application commands.", "success");
                console.log(chalk.blue("---------------------"));
            });
        } catch (error) {
            logger("Couldn't register application commands.", "error");
            console.error(chalk.red(`[ERROR] ${new Date().toISOString()} - ${error.message}`));
        }
    }
})();