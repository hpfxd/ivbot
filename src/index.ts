import "source-map-support/register";
import * as fs from "fs";

export const config = JSON.parse(fs.readFileSync("config.json", "utf8"));

import Api from "./api";
import Bot from "./mc";
import DiscordBot from "./discord/discord";

const api = new Api(undefined, config.apiKey);

export const mcbot = new Bot(config.username, config.password, api, config.guildId, config.weeklyExperienceRequirement);
mcbot.connect();

export const discordbot = new DiscordBot(config.discord.token, api, config.discord.roles, config.discord.owner, config.discord.webhook.id, config.discord.webhook.token, config.discord.chatChannel);
discordbot.start();

process.on("uncaughtException", (err) => {
    console.log(err);
});