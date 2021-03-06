import { Sequelize, Model, DataTypes } from "sequelize";
import { config } from "./index";

export const sequelize = new Sequelize(config["databaseUrl"], {
    dialectOptions: {
        timezone: config["databaseTimezone"]
    }
});

export class User extends Model {
    public id!: number;

    public minecraftId!: string;
    public minecraftName!: string;
    public discordId!: string;
    public noKick!: Date;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export class ExperienceHistory extends Model {
    public id!: number;

    public minecraftId!: string;
    public experience!: number;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

User.init({
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
    },
    minecraftId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    minecraftName: {
        type: new DataTypes.STRING(16),
        allowNull: false
    },
    discordId: {
        type: new DataTypes.STRING(18),
        allowNull: false
    },
    noKick: {
        type: new DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: "users",
    sequelize: sequelize
});

ExperienceHistory.init({
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
    },
    minecraftId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    experience: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
    }
}, {
    tableName: "experienceHistory",
    sequelize: sequelize
});

sequelize.sync().then(() => {
    console.log("Synced database.");
});
