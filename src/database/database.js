// import { Sequelize } from "sequelize";
// import dotenv from "dotenv";
// import { Config } from "../config/config.js";

// dotenv.config();

// const db = new Sequelize(
//   Config.database.name,
//   Config.database.username,
//   Config.database.password,
//   {
//     host: Config.database.host,
//     dialect: Config.database.dialect,
//     logging: process.env.NODE_ENV === "development" ? console.log : false,
//     dialectOptions: Config.database.dialectOptions,
//     pool: Config.database.pool,
//   }
// );

// export async function connectDB() {
//   try {
//     await db.authenticate();
//     console.log("✅ Database connection established successfully.");
//   } catch (error) {
//     console.error("❌ Unable to connect to the database:", error);
//   }
// }

// export default db;

import { Sequelize } from "sequelize";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Config } from "../config/config.js";

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
    await db.sync({ force: false });
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
