import Commando, { Command } from "discord.js-commando";
import Discord, { GuildMember } from "discord.js";
import * as d from "../../discord";
import * as db from "../../../db";
import { Op } from "sequelize";

export default class VerifyCommand extends Command {
    constructor(client: Commando.CommandoClient) {
        super(client, {
            name: "verify",
            group: "verification",
            memberName: "verify",
            description: "Link your Discord account with your Minecraft account.",
            examples: ["verify"],
            aliases: ["link"],
            guildOnly: true,
            throttling: {
                usages: 2,
                duration: 60
            }
        });
    }

    run(msg: Commando.CommandMessage): Promise<Discord.Message | Discord.Message[]> {
        return new Promise((resolve) => {
            db.User.findOne({
                where: {
                    discordId: {
                        [Op.eq]: msg.author.id
                    }
                }
            }).then((user: db.User) => {
                if (user) {
                    resolve(msg.say("❌ Your account is already linked!"));
                } else {
                    const code = this.getCode(msg.member);

                    msg.author.send(`✅ Use \`/gc v!${code}\` in-game to verify your account!\nThis code expires in **5 minutes**!`).then(() => {
                        resolve(msg.say("✅ Check your private messages!"));
                    }).catch(() => {
                        resolve(msg.say("❌ Could not private message you!"));
                    });
                }
            });
        }); // ✅❌
    }

    private getCode(member: GuildMember): string {
        const current = d.codes.find(c => c.user === member);

        if (current) {
            if (current.expires > new Date()) {
                return current.code;
            } else {
                d.codes.splice(d.codes.indexOf(current), 1);
            }
        }

        const code = this.makeCode(4);
        const expires = new Date();
        expires.setMinutes(expires.getMinutes() + 5); // now + 5 minutes

        d.codes.push({
            user: member,
            code,
            expires
        });

        return code;
    }

    private makeCode(length: number): string {
        let result = "";
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        const charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }
}