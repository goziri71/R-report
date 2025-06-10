import dotenv from "dotenv";
dotenv.config();

export const Config = {
  port: process.env.PORT || 4000,
  JWT_SECRET: process.env.JWT_SECRET,

  database: {
    name: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST || "localhost",
    dialect: "postgres",
    port: process.env.DB_PORT || 5432,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 60000,
      idle: 10000,
    },
  },

  environment: process.env.NODE_ENV || "development",
};
