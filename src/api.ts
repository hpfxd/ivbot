import phin from "phin";
import NodeCache from "node-cache";

/**
 * Represents a guild on Hypixel.
 * 
 * @property {string} id The ID of the guild.
 * @property {string} name The display name of the guild.
 * @property {Date} created Date representing the time of the guild's creation.
 * @property {number} experience The guild's total experience.
 * @property {number} level The guild's current level. Calculated from experience.
 * @property {GuildMember[]} members An array of {@link GuildMember}s
 */
export class Guild {
    id: string;
    name: string;
    created: Date;
    experience: number;
    level: number;
    members: GuildMember[];

    constructor(id: string, name: string, created: Date, experience: number, level: number, members: GuildMember[]) {
        this.id = id;
        this.name = name;
        this.created = created;
        this.experience = experience;
        this.level = level;
        this.members = members;
    }
}

/**
 * Represents a member of a guild on Hypixel.
 * 
 * @property {string} id The player's Minecraft UUID.
 * @property {string} guildRank The player's rank in the guild.
 * @property {Date} joined Date representing the time that the player joined the guild.
 * @property {number} quests The number of quests the player has completed while in the guild.
 * @property {number[]} dailyExperienceHistory An array of numbers containing the last 7 days of guild experience history.
 */
export class GuildMember {
    id: string;
    guildRank: string;
    joined: Date;
    quests: number;
    dailyExperienceHistory: number[];
    weeklyExperience: number;

    constructor(id: string, guildRank: string, joined: Date, quests: number, dailyExperienceHistory: number[]) {
        this.id = id;
        this.guildRank = guildRank;
        this.joined = joined;
        this.quests = quests;
        this.dailyExperienceHistory = dailyExperienceHistory;

        let sum = 0;
        for (const num of this.dailyExperienceHistory) sum += num;
        this.weeklyExperience = sum;
    }
}

export class Player {
    id: string;
    name: string;
    minecraftVersion: string;
    level: number;
    karma: number;
    firstLogin: Date;
    lastLogin: Date;

    constructor(id: string, name: string, minecraftVersion: string, level: number, karma: number, firstLogin: Date, lastLogin: Date) {
        this.id = id;
        this.name = name;
        this.minecraftVersion = minecraftVersion;
        this.level = level;
        this.karma = karma;
        this.firstLogin = firstLogin;
        this.lastLogin = lastLogin;
    }
}

export default class Api {
    baseUrl: string;
    apiKey: string;

    guildCache: NodeCache;
    playerCache: NodeCache;

    /**
     * Contruct an Api instance.
     * 
     * @param baseUrl The base URL to send all requests to.
     * @param apiKey The API key to use.
     */
    constructor(baseUrl = "https://hypixel.hpfxd.nl", apiKey: string = null) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;

        this.guildCache = new NodeCache({
            stdTTL: 3600 // 1 hour
        });

        this.playerCache = new NodeCache({
            stdTTL: 43200 // 12 hours
        });
    }

    /**
     * Fetch a guild from the Hypixel API.
     * 
     * @param id The ID of the guild.
     * @param cached Wheather to try to return a cached result.
     * @returns {Promise<Guild>} A promise containing the {@link Guild} object.
     */
    async getGuild(id: string, cached = true): Promise<Guild> {
        if (cached && this.guildCache.has(id)) {
            return this.guildCache.get(id);
        } else {
            const response = await phin(this.getEndpoint("/guild/" + id + "?", cached));
            const json = JSON.parse(response.body);

            const members: GuildMember[] = [];

            for (const member of json.members) {
                members.push(new GuildMember(member.uuid, member.guildRank, new Date(member.joined), member.quests, member.dailyExperienceHistory));
            }

            const guild = new Guild(json.id, json.name, new Date(json.created), json.experience, json.level, members);

            this.guildCache.set(id, guild);

            return guild;
        }
    }

    /**
     * Fetch a player from the Hypixel API.
     * 
     * @param id The UUID or Name of the player.
     * @param cached Wheather to try to return a cached result.
     * @returns {Promise<Player>} A promise containing the {@link Player} object.
     */
    async getPlayer(id: string, cached = true, games?: string[]): Promise<Player> {
        if (cached && this.playerCache.has(id)) {
            return this.playerCache.get(id);
        } else {
            const response = await phin(this.getEndpoint("/player/" + id + "?gamesNeeded=" + games + "&", cached));
            const json = JSON.parse(response.body).info;

            const player = new Player(json.uuid, json.username, json.minecraftVersion, json.networkLevel, json.karma, new Date(json.firstLogin), new Date(json.lastLogin));

            this.playerCache.set(id, player);

            return player;
        }
    }

    private getEndpoint(endpoint: string, cache = true): string {
        return this.baseUrl + endpoint + (this.apiKey ? "key=" + (this.apiKey + (cache ? "" : "&noCache")) : "");
    }
}
