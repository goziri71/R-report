import dotenv from "dotenv";
dotenv.config();

export const Config = {
  port: process.env.PORT || 30129,
  JWT_SECRET: process.env.JWT_SECRET,

  database: {
    name: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST || "localhost",
    dialect: "mysql",
  },

  environment: process.env.NODE_ENV || "development",
};
