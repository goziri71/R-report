import db from "../../database/database.js";
import { DataTypes } from "sequelize";

export const Task = db.define(
  "task",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    priority: {
      type: DataTypes.ENUM("low", "medium", "high"),
      allowNull: false,
      defaultValue: "medium",
    },
    status: {
      type: DataTypes.ENUM("to_do", "in_progress", "completed", "confirmed"),
      allowNull: false,
      defaultValue: "to_do",
    },
  },
  {
    indexes: [
      { fields: ["userId"] },
      { fields: ["status"] },
      { fields: ["priority"] },
    ],
  }
);
