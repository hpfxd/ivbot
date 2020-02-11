import Discord, { GuildMember } from "discord.js";
import Commando, { Command } from "discord.js-commando";
import { Op } from "sequelize";
import * as db from "../../../db";
import * as iv from "../../../index";

export default class ForceVerifyCommand extends Command {
    constructor(client: Commando.CommandoClient) {
        super(client, {
            name: "forceverify",
            group: "verification",
            memberName: "forceverify",
            description: "Forcefully link a Discord account to a Minecraft account.",
            examples: ["forceverify <@224349253978423297> hpf"],
            aliases: ["forcelink"],
            guildOnly: true,
            args: [
                {
                    key: "member",
                    prompt: "Who's Discord account would you like to link?",
                    type: "member"
                },
                {
                    key: "name",
                    prompt: "What Minecraft account would you like linked?",
                    type: "string"
                }
            ]
        });
    }

    run(msg: Commando.CommandMessage, args): Promise<Discord.Message | Discord.Message[]> {
        const member: GuildMember = args.member;
        const name: string = args.name;

        return new Promise((resolve) => {
            db.User.findOne({
                where: {
                    discordId: {
                        [Op.eq]: member.id
                    }
                }
            }).then((user: db.User) => {
                if (user) {
                    user.destroy();
                }

                if (name === "none") {
                    resolve(msg.say("✅ Cleared linked account."));
                } else {
                    iv.discordbot.linkAccount(name, member);
                    resolve(msg.say("✅ Linked account."));
                }
            });
        });
    }

    hasPermission(msg: Commando.CommandMessage): boolean {
        return msg.member.hasPermission("ADMINISTRATOR");
    }
}