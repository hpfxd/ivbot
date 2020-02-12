import * as iv from "../index";
import Discord, { WebhookClient } from "discord.js";
import { CommandoClient as Client } from "discord.js-commando";
import Bottleneck from "bottleneck";
import path from "path";
import md5 from "md5";
import Api from "../api";
import * as db from "../db";
import { Op } from "sequelize";
import schedule from "node-schedule";
import Leaderboards from "./leaderboards";

export const codes: {
    user: Discord.GuildMember;
    code: string;
    expires: Date;
}[] = [];

export default class DiscordBot {
    private token: string;
    api: Api;
    roles: object;
    chatChannel: string;
    client: Client;
    webhookClient: WebhookClient;
    guildChatLimiter: Bottleneck;
    guild: Discord.Guild;

    constructor(token: string, api: Api, roles: object, owner: string, webhookId: string, webhookToken: string, chatChannel: string) {
        this.token = token;
        this.api = api;
        this.roles = roles;
        this.chatChannel = chatChannel;
        this.client = new Client({
            owner,
            commandPrefix: "!",
            unknownCommandResponse: false,
            disableEveryone: true
        });

        this.webhookClient = new WebhookClient(webhookId, webhookToken);

        this.guildChatLimiter = new Bottleneck({
            maxConcurrent: 1,
            minTime: 3000
        });

        schedule.scheduleJob("0 0 * * *", async () => { // every day
            console.log("Starting nickname updater job.");
            const members = (await api.getGuild(iv.config["guildId"], false)).members;
            const discordMembers = await db.User.findAll();

            for (const member of discordMembers) {
                const gm = members.find(c => c.id === member.minecraftId);
                try {
                    const dm = await this.guild.fetchMember(member.discordId);

                    const player = await api.getPlayer(member.minecraftId);
                    if (player.name !== member.minecraftName) {
                        // eslint-disable-next-line @typescript-eslint/no-empty-function
                        await dm.setNickname(player.name, "Name changed. (" + member.minecraftName + ")").catch(() => {});

                        member.minecraftName = player.name;
                        member.save();
                    }

                    if (!gm) {
                        await dm.removeRole(this.roles["Member"], "User not in guild.");
                    }
                } catch (e) {
                    if (e.message === "Invalid or uncached id provided.") {
                        await member.destroy();
                    } else {
                        console.log(e);
                    }
                }
            }
        });
    }

    start(): void {
        this.client.login(this.token);

        this.client.registry
            // Registers your custom command groups
            .registerGroups([
                ["verification", "Verification commands"],
                ["moderation", "Guild moderation tools for Officers."],
                ["player", "Commands that interact with players."]
            ])

            // Registers all built-in groups, commands, and argument types
            .registerDefaults()
            // Registers all of your commands in the ./commands/ directory
            .registerCommandsIn(path.join(__dirname, "commands"));


        this.client.on("ready", () => {
            this.client.on("guildMemberRemove", async (member) => {
                const user: db.User = await db.User.findOne({
                    where: {
                        discordId: {
                            [Op.eq]: member.id
                        }
                    }
                });

                if (user) {
                    this.log("Destroying " + member.user.tag + " link as they left the server.");
                    user.destroy();
                }
            });
            this.log("Logged in as " + this.client.user.tag);
            this.guild = this.client.guilds.find(c => c.name === "InfiniteVoid");
            
            new Leaderboards(this.api, this.guild.channels.get(iv.config["discord"]["leaderboards"]["channel"]) as Discord.TextChannel);
        });

        this.client.on("message", (msg) => {
            if (msg.author.id === this.client.user.id) return;
            if (msg.author.discriminator === "0000") return;
            if (msg.channel.id === this.chatChannel) {
                if (msg.content.length > 225) { // minecraft chat limit
                    msg.react("❌");
                } else {
                    this.guildChatLimiter.schedule(async () => {
                        const user: db.User = await db.User.findOne({
                            where: {
                                discordId: {
                                    [Op.eq]: msg.author.id
                                }
                            }
                        });

                        let username = msg.author.tag;

                        if (user) {
                            username = user.minecraftName;
                        }

                        iv.mcbot.bot.chat(`/gc [D] [${md5(msg.id).substr(0, 5)}] ${username}: ${msg.content}`);

                        return null;
                    });
                }
            }
        });
    }

    onGuildChat(name: string, msg: string): void {
        if (msg.startsWith("v!") && msg.length === 6) { // format for a linking code
            const code = msg.replace(/v!/, "");
            const c = codes.find(c => c.code === code);

            if (c) {
                if (c.expires > new Date()) {
                    // code didn't expire yet
                    codes.splice(codes.indexOf(c), 1);
                    this.linkAccount(name, c.user);
                    return;
                } else {
                    codes.splice(codes.indexOf(c), 1);
                }
            }
        }

        this.webhookClient.send(msg, {
            username: name,
            avatarURL: `https://minotar.net/helm/${name}/128`
        });
    }

    linkAccount(name: string, member: Discord.GuildMember): void {
        this.api.getPlayer(name).then((player) => {
            db.User.create({
                minecraftId: player.id,
                minecraftName: player.name,
                discordId: member.user.id
            }).then(() => {
                this.log("Successfully linked " + player.name);
                member.addRoles([this.roles["linked"], this.roles["Member"]], "Account linked: " + player.name);

                // eslint-disable-next-line @typescript-eslint/no-empty-function
                member.setNickname(player.name).catch(() => { });
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                member.send(`✅ Successfully linked account to **${player.name}**!`).catch(() => { });
            });
        });
    }

    private log(message: string): void {
        console.log("[Discord] " + message);
    }
}
