import * as iv from "./index";
import * as mineflayer from "mineflayer";
import * as tokens from "prismarine-tokens";
import Bottleneck from "bottleneck";
import schedule from "node-schedule";
import Api from "./api";
import md5 from "md5";

import * as db from "./db";
import { Op } from "sequelize";

export default class Bot {
    username: string;
    password: string;
    bot;
    api: Api;
    blacklisted: string[] = [];

    kickLimiter: Bottleneck;

    constructor(username: string, password: string, api: Api, guildId: string, expReq: number) {
        this.username = username;
        this.password = password;
        this.api = api;

        this.kickLimiter = new Bottleneck({
            minTime: 5000,
            maxConcurrent: 1
        });

        schedule.scheduleJob("0 23 * * *", async () => { // at 23:00
            this.log("Starting experience requirement sweep.");
            const guild = await api.getGuild(guildId, false);

            const d = new Date();
            d.setDate(d.getDate() - 7);

            const d1 = new Date();
            d1.setDate(d1.getDate() - 3);

            for (const member of guild.members) {
                db.ExperienceHistory.create({
                    minecraftId: member.id,
                    experience: member.dailyExperienceHistory[0]
                });
                if (member.guildRank === "Member") {
                    let xpReq = 0;
                    let days = 0;

                    if (member.joined.getTime() < d.getTime()) {
                        xpReq = expReq;
                        days = 7;
                    } else if (member.joined.getTime() < d1.getTime()) {
                        xpReq = expReq / 5;
                        days = 3;
                    }

                    if (xpReq !== 0 && member.weeklyExperience < xpReq) {
                        // player does not meet weekly experience requirement, so kick

                        this.kickLimiter.schedule(async () => {
                            this.log(`Kicking player for: Experience Requirement: ${member.weeklyExperience.toLocaleString()}/${xpReq.toLocaleString()} gained in past ${days} days.`);
                            iv.mcbot.bot.chat(`/g kick ${member.id} Experience Requirement: ${member.weeklyExperience.toLocaleString()}/${xpReq.toLocaleString()} gained in past ${days} days.`);

                            const user: db.User = await db.User.findOne({
                                where: {
                                    minecraftId: {
                                        [Op.eq]: member.id
                                    }
                                }
                            });

                            if (user) {
                                try {
                                    const discordUser = await iv.discordbot.guild.fetchMember(user.discordId);

                                    if (discordUser) {
                                        await discordUser.removeRole(iv.discordbot.roles["Member"]);
                                    }
                                    // eslint-disable-next-line no-empty
                                } catch (ignored) { }
                            }

                            return null;
                        });
                    }
                }
            }
        });

        schedule.scheduleJob("*/15 * * * *", () => {
            this.bot.chat("/tipall");
        });
    }

    connect(): void {
        tokens.use({
            username: this.username,
            password: this.password,

            host: "hypixel.net",
            port: 25565,
            version: "1.12.2", // in 1.12, hypixel allows us to use a larger chat length

            tokensLocation: "./bot_tokens.json",
            tokensDebug: true
        }, (err: Error, opts: object) => {
            if (err) {
                this.log("Auth error");
                console.log(err);
                this.log("Reconnecting in 30s.");
                setTimeout(this.connect, 30e3);
                return;
            }

            if (!opts["username"]) {
                this.log("Invalid username. Trying to connect again in 30s.");
                setTimeout(() => this.connect(), 30e3); // 30 seconds
                return;
            }

            console.log(opts);

            this.bot = mineflayer.createBot(opts);

            this.bot.chatAddPattern(/^Guild >(?: \[.+\])? ([[A-Za-z0-9_]{0,16})(?: \[.+\])?: (.+)$/, "guild:chat");
            this.bot.chatAddPattern(/^(?:\[[A-Za-z+ ]+\] )?([A-Za-z0-9_]{1,16}) joined the guild!$/m, "guild:join");
            this.bot.chatAddPattern(/^(?:\[[A-Za-z+ ]+\] )?([A-Za-z0-9_]{1,16}) has requested to join the Guild!$/m, "guild:requestJoin");
            this.bot.chatAddPattern(/^(?:\[[A-Za-z+ ]+\] )?([A-Za-z0-9_]{1,16}) left the guild!$/m, "guild:leave");
            this.bot.chatAddPattern(/^(?:\[[A-Za-z+ ]+\] )?([A-Za-z0-9_]{1,16}) was kicked from the guild by (?:\[[A-Za-z+ ]+\] )?([A-Za-z0-9_]{1,16})$!/m, "guild:kick");

            this.bot.on("connect", () => {
                this.log("Connected");
                setTimeout(() => this.bot.chat("§"), 5000); // kick to limbo
            });

            this.bot.on("message", (msg) => {
                this.log(msg.toAnsi());
            });

            this.bot.on("end", () => {
                try {
                    this.log("Connection ended.");
                    this.log("Reconnecting in 30 seconds.");
                    this.disconnect();
                } catch (e) {
                    console.log(e);
                }

                setTimeout(() => this.connect(), 30e3); // 30 seconds
            });

            this.bot.on("guild:chat", (name: string, message: string) => {
                if (name === this.bot.username) return;
                iv.discordbot.onGuildChat(name, message.replace(/([*_~])/g, "\\$1"));
            });

            this.bot.on("guild:requestJoin", async (name: string) => {
                if (this.blacklisted.includes(name)) return;
                const player = await this.api.getPlayer(name);

                this.log(`Player ${player.name}. Level: ${player.level}`);

                if (player.level >= iv.config["networkLevelRequirement"]) {
                    this.bot.chat("/guild accept " + player.name);
                }
            });

            this.bot.on("guild:join", (name: string) => {
                iv.discordbot.guildChatLimiter.schedule(async () => {
                    this.bot.chat(`/gc [${md5(name).substr(0, 5)}] Welcome to the guild, ${name}! /g discord`);
                    return null;
                });
                iv.discordbot.webhookClient.send(`**${name.replace(/([*_~])/g, "\\$1")}** has joined the guild!`);
            });

            this.bot.on("guild:kick", (name: string, by: string) => {
                this.blacklisted.push(name);
                iv.discordbot.webhookClient.send(`**${name.replace(/([*_~])/g, "\\$1")}** was kicked from the guild by **${by}**`);
            });

            this.bot.on("guild:leave", (name: string) => {
                this.blacklisted.push(name);
                iv.discordbot.webhookClient.send(`**${name.replace(/([*_~])/g, "\\$1")}** left the guild.`);
            });
        });
    }

    disconnect(): void {
        this.bot.quit();
        this.bot.removeAllListeners();
    }

    private log(message: string): void {
        console.log("[MC] " + message);
    }
}
