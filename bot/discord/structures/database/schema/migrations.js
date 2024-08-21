const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
    channelId: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    topic: { type: String, default: null },
    nsfw: { type: Boolean, default: false },
    position: { type: Number },
}, { _id: false });

const roleSchema = new mongoose.Schema({
    roleId: { type: String, required: true },
    name: { type: String, required: true },
    color: { type: String, default: "#000000" },
    hoist: { type: Boolean, default: false },
    position: { type: Number },
    permissions: { type: [String], default: [] },
}, { _id: false });

const memberSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    username: { type: String, required: true },
    discriminator: { type: String, required: true },
    nickname: { type: String, default: null },
    roles: { type: [String], default: [] },
    joinedAt: { type: Date, required: true },
    isBot: { type: Boolean, default: false },
}, { _id: false });

const automodSchema = new mongoose.Schema({
    enabled: { type: Boolean, default: false },
    bannedWords: { type: [String], default: [] },
    maxMentions: { type: Number, default: 5 },
    logChannelId: { type: String, default: null },
    explicitImageFilter: { type: Boolean, default: false },
}, { _id: false });

const guildSchema = new mongoose.Schema({
    clientId: { type: String, required: true },
    guildId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    ownerId: { type: String, required: true },
    region: { type: String, default: "unknown" },
    memberCount: { type: Number, default: 0 },
    large: { type: Boolean, default: false },
    icon: { type: String, default: null },
    splash: { type: String, default: null },
    channels: { type: [channelSchema], default: [] },
    roles: { type: [roleSchema], default: [] },
    members: { type: [memberSchema], default: [] },
    automod: { type: automodSchema, default: () => ({}) },
    welcomeChannelId: { type: String, default: null },
    leaveChannelId: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

guildSchema.index({ guildId: 1 });
guildSchema.index({ "members.userId": 1 });

module.exports = mongoose.model('Guild', guildSchema);