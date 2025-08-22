import { Sequelize } from "sequelize";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Config } from "../config/config.js";
// Avoid importing models here to prevent circular init errors; use raw queries for cleanup

dotenv.config();

// PostgreSQL connection (existing)
const db = new Sequelize(
  Config.database.name,
  Config.database.username,
  Config.database.password,
  {
    host: Config.database.host,
    dialect: Config.database.dialect,
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    dialectOptions: Config.database.dialectOptions,
    pool: Config.database.pool,
    logging: false,
  }
);

// MongoDB connection function
export async function connectMongoDB() {
  try {
    await mongoose.connect(Config.mongodb.uri, Config.mongodb.options);
    console.log("✅ MongoDB connection established successfully.");
  } catch (error) {
    console.error("❌ Unable to connect to MongoDB:", error);
    process.exit(1);
  }
}

// PostgreSQL connection function (existing)
export async function connectDB() {
  try {
    await db.authenticate();
    console.log("✅ PostgreSQL connection established successfully.");
  } catch (error) {
    console.error("❌ Unable to connect to PostgreSQL:", error);
  }
}

// Initialize both databases
export async function initializeDatabases() {
  try {
    console.log("🔄 Initializing databases...");
    await connectDB();
    await connectMongoDB();
    // Pre-sync cleanup: orphan rows using raw SQL to avoid circular imports
    try {
      await db.query(
        'DELETE FROM "ActionItems" ai WHERE NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."id" = ai."userId")'
      );
      await db.query(
        'DELETE FROM "OngoingTasks" og WHERE NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."id" = og."userId")'
      );
      await db.query(
        'DELETE FROM "CompletedTasks" ct WHERE NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."id" = ct."userId")'
      );
      await db.query(
        'DELETE FROM "ActionItems" ai WHERE NOT EXISTS (SELECT 1 FROM "WeeklyReports" wr WHERE wr."id" = ai."reportId")'
      );
      await db.query(
        'DELETE FROM "OngoingTasks" og WHERE NOT EXISTS (SELECT 1 FROM "WeeklyReports" wr WHERE wr."id" = og."reportId")'
      );
      await db.query(
        'DELETE FROM "CompletedTasks" ct WHERE NOT EXISTS (SELECT 1 FROM "WeeklyReports" wr WHERE wr."id" = ct."reportId")'
      );
    } catch (cleanupError) {
      console.warn(
        "⚠️ Pre-sync cleanup warning:",
        cleanupError?.message || cleanupError
      );
    }
    await db.sync({ alter: true });
    console.log("✅ All databases initialized successfully!");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  console.log("🔄 Shutting down gracefully...");

  try {
    await db.close();
    await mongoose.connection.close();
    console.log("✅ Database connections closed.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
});

export default db;
