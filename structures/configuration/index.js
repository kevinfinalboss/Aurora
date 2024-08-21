require('dotenv').config();

module.exports = {
    client_token: process.env.CLIENT_TOKEN,
    client_id: process.env.CLIENT_ID,
    client_prefix: process.env.CLIENT_PREFIX,
    mongodb_url: process.env.MONGODB_URL,
    developers: process.env.DEVELOPERS ? process.env.DEVELOPERS.split(',') : [],
    sharding: process.env.SHARDING === 'true',
    database: process.env.DATABASE === 'true',
}
