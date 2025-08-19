import db from "../../database/database.js";
import { DataTypes } from "sequelize";

export const WeeklyReport = db.define("WeeklyReport", {
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
  department: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING, // values: 'draft' | 'submitted' | 'archived'
    allowNull: false,
    defaultValue: "submitted",
  },
  submittedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lastSavedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
});

export const ActionItem = db.define(
  "ActionItems",
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
    reportId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: "ActionItems",
    freezeTableName: true,
  }
);

export const OngoingTask = db.define(
  "OngoingTasks",
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
    reportId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: "OngoingTasks",
    freezeTableName: true,
  }
);

export const CompletedTask = db.define(
  "CompletedTasks",
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
    reportId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: "CompletedTasks",
    freezeTableName: true,
  }
);
