import express from "express";
import cors from "cors";
import { Config } from "./src/config/config.js";
import { connectDB } from "./src/database/database.js";
import { ErrorHandlerMiddleware } from "./src/middleware/errorHandler.js";
import userRouter from "./src/routes/admin/users/index.js";
import authRouter from "./src/routes/user/auth/index.js";
import incedentRoutes from "./src/routes/user/incident/index.js";
import allusereport from "./src/routes/admin/users/getallreport.js";
import thirdPartyRoutes from "./src/routes/thirdpart/index.js";
import db from "./src/database/database.js";
import setupAssociations from "./src/models/dbasociation.js";

const app = express();
const port = Config.port;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);
setupAssociations();

app.use("/api/v1", userRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/incident", incedentRoutes);
app.use("/api/v1/report", allusereport);
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
