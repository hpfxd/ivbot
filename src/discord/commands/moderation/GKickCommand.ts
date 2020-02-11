import Commando, { Command } from "discord.js-commando";
import Discord from "discord.js";
import * as iv from "../../../index";
import * as db from "../../../db";
import { Op } from "sequelize";

export default class GKickCommand extends Command {
    constructor(client: Commando.CommandoClient) {
        super(client, {
            name: "gkick",
            group: "moderation",
            memberName: "gkick",
            description: "Kick a player from the guild.",
            examples: ["gkick hpf"],
            guildOnly: true,
            args: [
                {
                    key: "player",
                    prompt: "What player would you like to kick?",
                    type: "string",
                },
                {
                    key: "reason",
                    prompt: "What is the reason for the kick?",
                    type: "string",
                }
            ]
        });
    }

    async run(msg: Commando.CommandMessage, { player, reason }): Promise<Discord.Message | Discord.Message[]> {
        iv.mcbot.bot.chat(`/g kick ${player} ${reason}`);

        const user: db.User = await db.User.findOne({
            where: {
                discordId: {
                    [Op.eq]: msg.author.id
                }
            }
        });

        if (user) {
            const member = iv.discordbot.guild.members.find(c => c.id === user.discordId);

            if (member) {
                member.kick(`Kicked by ${msg.author.tag}: ${reason}`);
            }
        }

        return msg.say(`Successfully kicked **${player}**.`);
    }

    hasPermission(msg: Commando.CommandMessage): boolean {
        return msg.member.hasPermission("KICK_MEMBERS");
    }
}