import express from "express";
import cors from "cors";
import { Config } from "./src/config/config.js";
import { connectDB } from "./src/database/database.js";
import { ErrorHandlerMiddleware } from "./src/middleware/errorHandler.js";
import userRouter from "./src/routes/admin/users/index.js";
import authRouter from "./src/routes/user/auth/index.js";
import incedentRoutes from "./src/routes/user/incident/index.js";
import allusereport from "./src/routes/admin/users/getallreport.js";
import adminEvent from "./src/routes/admin/event/index.js";
import createWeeklyReport from "./src/routes/weeklyReport/index.js";
import thirdPartyRoutes from "./src/routes/thirdpart/index.js";
import db from "./src/database/database.js";
import setupAssociations from "./src/models/dbasociation.js";

const app = express();
const port = Config.port;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: [
      "http://localhost:5174",
      "http://localhost:5173",
      "https://redbiller-work-neon.vercel.app",
    ],
    credentials: true,
  })
);
setupAssociations();

app.use("/api/v1", userRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/incident", incedentRoutes);
app.use("/api/v1/report", allusereport);
app.use("/api/v1/admin", adminEvent);
app.use("/api/v1/user", createWeeklyReport);
app.use("/api/v1/thirdparty", thirdPartyRoutes);
app.use(ErrorHandlerMiddleware);

(async () => {
  try {
    await db.sync();
    await connectDB();
    app.listen(port, () => {
      console.log(`🚀 Server listening on port ${port}`);
    });
  } catch (error) {
    console.log(error.message);
  }
})();
