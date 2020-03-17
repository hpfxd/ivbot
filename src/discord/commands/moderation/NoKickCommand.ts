import Commando, { Command } from "discord.js-commando";
import Discord from "discord.js";
import * as iv from "../../../index";
import * as db from "../../../db";
import { Op } from "sequelize";

export default class GKickCommand extends Command {
    constructor(client: Commando.CommandoClient) {
        super(client, {
            name: "nokick",
            group: "moderation",
            memberName: "nokick",
            description: "Prevent a player from being kicked by the weekly experience requirement.",
            examples: ["nokick hpf 3"],
            guildOnly: true,
            args: [
                {
                    key: "player",
                    prompt: "What player would you like to apply a NoKick to?",
                    type: "string",
                },
                {
                    key: "length",
                    prompt: "What is length in days for this entry?",
                    type: "integer",
                }
            ]
        });
    }

    async run(msg: Commando.CommandMessage, { player, length }): Promise<Discord.Message | Discord.Message[]> {

        const user: db.User = await db.User.findOne({
            where: {
                minecraftName: {
                    [Op.eq]: player
                }
            }
        });

        if (user) {
            const member = iv.discordbot.guild.members.find(c => c.id === user.discordId);

            const date = new Date();
            date.setDate(date.getDate() + length);

            member.send(`An officer has applied an inactivity notice to your account for **${length}** days.\n` +
            `This means you will not be affected by the weekly experience requirement until **${date.toLocaleString()}**`);

            user.noKick = date;
            user.save();

            return msg.say("Applied a NoKick for **" + length + "** days!");
        } else {
            return msg.say("Could not find the user in Discord.");
        }
    }

    hasPermission(msg: Commando.CommandMessage): boolean {
        return msg.member.hasPermission("KICK_MEMBERS");
    }
}