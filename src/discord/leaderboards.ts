import Api, * as hapi from "../api";
import * as db from "../db";
import { QueryTypes } from "sequelize";
import schedule from "node-schedule";
import { Message, TextChannel, RichEmbed } from "discord.js";
import { config } from "../index";

class Leaderboard {
    name: string;
    color: number;
    message: Message;
    updater: Function;

    constructor(name: string, color: number, message: Message, updater: Function) {
        this.name = name;
        this.color = color;
        this.message = message;
        this.updater = updater;
    }

    async update(guild: hapi.Guild): Promise<Message> {
        const embed = new RichEmbed();
        embed.setTitle(this.name);
        embed.setTimestamp(new Date());
        embed.setColor(this.color);

        const result: {
            name: string;
            value: number;
        }[] = await this.updater(guild);

        for (const user of result) {
            embed.addField(`**#${result.indexOf(user) + 1}** ${user.name.replace(/([*_~])/g, "\\$1")}`, user.value.toLocaleString(), false);
        }

        return await this.message.edit("_ _", embed);
    }
}

export default class Leaderboards {
    private api: Api;
    channel: TextChannel;
    leaderboards: Leaderboard[] = [];

    constructor(api: Api, channel: TextChannel) {
        this.api = api;
        this.channel = channel;

        console.log("Setting up leaderboards");
        this.setupLeaderboards();

        schedule.scheduleJob("0 * * * *", () => this.updateLeaderboards());
    }

    async updateLeaderboards(): Promise<null> {
        console.log("Starting leaderboard update job.");
        const guild = await this.api.getGuild(config["guildId"]);

        for (const lb of this.leaderboards) {
            console.log("Updating leaderboard '" + lb.name + "'");
            await lb.update(guild);
        }

        return null;
    }

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    private async setupLeaderboards() {
        const messages = config["discord"]["leaderboards"]["messages"];

        this.leaderboards.push(new Leaderboard("Lifetime Guild Experience", 0x4293f5, await this.channel.fetchMessage(messages["lifetimeXp"]), async () => {
            const users = await db.sequelize.query("SELECT minecraftId, sum(experience) AS experience FROM experienceHistory GROUP BY minecraftId ORDER BY experience DESC LIMIT 10", {
                type: QueryTypes.SELECT
            });

            const result = [];
            for (const user of users) {
                const player = await this.api.getPlayer(user.minecraftId);

                result.push({
                    name: player.name,
                    value: user.experience
                });
            }

            return result;
        }));

        this.leaderboards.push(new Leaderboard("Weekly Guild Experience", 0x5742f5, await this.channel.fetchMessage(messages["weeklyXp"]), async (guild: hapi.Guild) => {
            const res = [];
            for (const member of guild.members) {
                res.push({
                    id: member.id,
                    value: member.weeklyExperience
                });
            }

            res.sort((a, b) => b.value - a.value);
            res.splice(10, res.length);

            const result = [];

            for (const r of res) {
                const player = await this.api.getPlayer(r.id);

                result.push({
                    name: player.name,
                    value: r.value
                });
            }

            return result;
        }));

        this.leaderboards.push(new Leaderboard("Daily Guild Experience", 0xb942f5, await this.channel.fetchMessage(messages["dailyXp"]), async (guild: hapi.Guild) => {
            const res = [];
            for (const member of guild.members) {
                res.push({
                    id: member.id,
                    value: member.dailyExperienceHistory[0]
                });
            }

            res.sort((a, b) => b.value - a.value);
            res.splice(10, res.length);

            const result = [];

            for (const r of res) {
                const player = await this.api.getPlayer(r.id);

                result.push({
                    name: player.name,
                    value: r.value
                });
            }

            return result;
        }));
    }
}