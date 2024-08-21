const mongoose = require('mongoose');
const config = require('../configuration/index');
const { logger } = require('../functions/logger');

const connect = async () => {
    try {
        mongoose.set('strictQuery', true);

        await mongoose.connect(config.mongodb_url, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            connectTimeoutMS: 10000,
            serverSelectionTimeoutMS: 5000,
            autoReconnect: true,
            reconnectTries: Number.MAX_VALUE,
            reconnectInterval: 1000,
        });

        mongoose.connection.once("open", () => {
            console.log("\n---------------------");
            logger("Database connection established successfully", "success");
            console.log("---------------------");
        });

        mongoose.connection.on("error", (error) => {
            console.log("\n---------------------");
            logger(`Database connection error: ${error.message}`, "error");
            console.log("---------------------");
        });

        mongoose.connection.on("reconnected", () => {
            console.log("\n---------------------");
            logger("Database reconnected successfully", "info");
            console.log("---------------------");
        });

        mongoose.connection.on("disconnected", () => {
            console.log("\n---------------------");
            logger("Database connection lost. Attempting to reconnect...", "warn");
            console.log("---------------------");
        });

    } catch (error) {
        console.log("\n---------------------");
        logger(`Failed to connect to the database: ${error.message}`, "error");
        console.log("---------------------");
        process.exit(1);
    }
};

module.exports = { connect };
