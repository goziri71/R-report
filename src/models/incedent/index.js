import db from "../../database/database.js";
import { DataTypes } from "sequelize";

export const Incident = db.define(
  "Incident",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      unique: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    incidentphoto: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    voiceNote: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    incidentMessage: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    timestamps: true,
  }
);
