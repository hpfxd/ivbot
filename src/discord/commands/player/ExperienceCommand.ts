import Commando, { Command } from "discord.js-commando";
import Discord from "discord.js";
import * as iv from "../../../index";
import * as db from "../../../db";
import { Op } from "sequelize";

export default class ExperienceCommand extends Command {
    constructor(client: Commando.CommandoClient) {
        super(client, {
            name: "experience",
            group: "player",
            memberName: "experience",
            description: "Check your weekly guild experience.",
            examples: ["experience"],
            guildOnly: false,
            aliases: ["exp", "xp"],
            throttling: {
                usages: 2,
                duration: 30
            },
            args: [
                {
                    key: "player",
                    prompt: "Who's guild experience would you like to view?",
                    type: "string",
                    default: "self"
                }
            ]
        });
    }

    async run(msg: Commando.CommandMessage, { player }): Promise<Discord.Message | Discord.Message[]> {
        let user: db.User;

        if (player === "self") {
            user = await db.User.findOne({
                where: {
                    discordId: {
                        [Op.eq]: msg.author.id
                    }
                }
            });
        } else {
            user = await db.User.findOne({
                where: {
                    minecraftName: {
                        [Op.eq]: player
                    }
                }
            });
        }

        if (user) {
            const guild = await iv.discordbot.api.getGuild(iv.config["guildId"], false);
            const guildPlayer = guild.members.find(c => c.id === user.minecraftId);
            const expReq = iv.config["weeklyExperienceRequirement"];

            if (guildPlayer) {
                const embed = new Discord.RichEmbed();

                embed.setAuthor(user.minecraftName, `https://minotar.net/helm/${user.minecraftId}/128`);
                embed.addField("**Total Weekly Experience**", guildPlayer.weeklyExperience.toLocaleString(), false);
                embed.addField("**Weekly Requirement Progress**", `${(guildPlayer.weeklyExperience / expReq * 100).toFixed(2)}% (${guildPlayer.weeklyExperience.toLocaleString()}/${expReq.toLocaleString()})`, false);
                embed.addBlankField(false);

                for (let i = 0; i < guildPlayer.dailyExperienceHistory.length; i++) {
                    const exp = guildPlayer.dailyExperienceHistory[i];
                    const date = new Date();
                    date.setDate(date.getDate() - i);

                    embed.addField(i === 0 ? "Today" : date.toLocaleString("default", { month: "short", day: "2-digit" }), exp.toLocaleString(), true);
                }

                return msg.embed(embed);
            } else {
                return msg.say("❌ Could not find linked account in the guild.");
            }
        } else {
            return msg.say("❌ Could not find linked account.");
        }
    }
}