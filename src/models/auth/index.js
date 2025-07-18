import db from "../../database/database.js";
import { DataTypes } from "sequelize";

export const User = db.define("User", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  billerId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  middleName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  dob: {
    type: DataTypes.STRING,
  },
  nationality: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  occupation: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  gender: {
    type: DataTypes.ENUM("MALE", "FEMALE", "OTHER"),
    allowNull: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM("user", "admin", "superadmin"),
    defaultValue: "user",
    allowNull: false,
  },
  pushSubscription: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null,
  },
});
