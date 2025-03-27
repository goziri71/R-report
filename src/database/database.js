import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import { Config } from "../config/config.js";

dotenv.config(); // Load environment variables

// Create a new Sequelize instance using environment variables
const db = new Sequelize(
  Config.database.name,
  Config.database.username,
  Config.database.password,
  {
    host: Config.database.host,
    dialect: Config.database.dialect,
    logging: process.env.NODE_ENV === "development" ? console.log : false,
  }
);

// Test Database Connection
export async function connectDB() {
  try {
    await db.authenticate();
    console.log("✅ Database connection established successfully.");
  } catch (error) {
    console.error("❌ Unable to connect to the database:", error);
  }
}

export default db;
