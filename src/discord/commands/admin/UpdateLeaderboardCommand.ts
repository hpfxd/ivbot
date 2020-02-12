import Commando, { Command } from "discord.js-commando";
import Discord from "discord.js";
import * as iv from "../../../index";

export default class UpdateLeaderboardCommand extends Command {
    constructor(client: Commando.CommandoClient) {
        super(client, {
            name: "updateleaderboard",
            group: "admin",
            memberName: "updateleaderboard",
            description: "Manually update the leaderboards. Used for debugging.",
            examples: ["updateleaderboard"],
            ownerOnly: true
        });
    }

    async run(msg: Commando.CommandMessage): Promise<Discord.Message | Discord.Message[]> {
        await iv.discordbot.leaderboards.updateLeaderboards();
        return msg.say("Updated leaderboards.");
    }
}