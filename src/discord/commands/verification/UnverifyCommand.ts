import Commando, { Command } from "discord.js-commando";
import Discord from "discord.js";
import * as iv from "../../../index";
import * as db from "../../../db";
import { Op } from "sequelize";

export default class UnverifyCommand extends Command {
    constructor(client: Commando.CommandoClient) {
        super(client, {
            name: "unverify",
            group: "verification",
            memberName: "unverify",
            description: "Unlink your Discord account with your Minecraft account.",
            examples: ["unverify"],
            aliases: ["unlink"],
            guildOnly: true,
            throttling: {
                usages: 1,
                duration: 60
            }
        });
    }

    async run(msg: Commando.CommandMessage): Promise<Discord.Message | Discord.Message[]> {
        const user: db.User = await db.User.findOne({
            where: {
                discordId: {
                    [Op.eq]: msg.author.id
                }
            }
        });

        if (user) {
            await user.destroy();
            await msg.member.removeRoles([iv.discordbot.roles["linked"], iv.discordbot.roles["Member"]], "Account unlinked.");
            return msg.say("✅ Unlinked account.");
        } else {
            return msg.say("❌ Could not find your linked account.");
        }
    }
}