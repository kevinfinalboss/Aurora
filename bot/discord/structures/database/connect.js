const mongoose = require('mongoose');
const { logger } = require('../functions/logger');

const connect = async (mongodb_url) => {
    try {
        mongoose.set('strictQuery', true);

        if (!mongodb_url) {
            throw new Error("mongodb_url não foi fornecido ou está indefinido.");
        }

        await mongoose.connect(mongodb_url, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            connectTimeoutMS: 10000,
            serverSelectionTimeoutMS: 5000
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
