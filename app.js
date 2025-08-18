import express from "express";
import cors from "cors";
import { Config } from "./src/config/config.js";
import { initializeDatabases } from "./src/database/database.js";
import { ErrorHandlerMiddleware } from "./src/middleware/errorHandler.js";
import { rateLimiters } from "./src/middleware/rateLimiters.js";
import userRouter from "./src/routes/admin/users/index.js";
import authRouter from "./src/routes/user/auth/index.js";
import incedentRoutes from "./src/routes/user/incident/index.js";
import allusereport from "./src/routes/admin/users/getallreport.js";
import adminEvent from "./src/routes/admin/event/index.js";
import createWeeklyReport from "./src/routes/weeklyReport/index.js";
import thirdPartyRoutes from "./src/routes/thirdpart/index.js";
import chatRoutes from "./src/routes/chat/index.js";
import db from "./src/database/database.js";
import setupAssociations from "./src/models/dbasociation.js";
import http from "http"; // Import http to create the server for socket.io
import { Server } from "socket.io"; // Import socket.io
import { handleChatSocketEvents } from "./src/service/chatSocketHandler.js";
import { User } from "./src/models/auth/index.js";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = Config.port;
const server = http.createServer(app);
const io = new Server(server);

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(
  cors({
    origin: [
      "http://localhost:5174",
      "http://localhost:5173",
      "https://redbiller-work-neon.vercel.app",
      "https://main.d5ival0pckjqv.amplifyapp.com",
    ],
    credentials: true,
  })
);

app.use(rateLimiters.global);
setupAssociations();

app.use((req, res, next) => {
  req.io = io;
  next();
});
app.use("/api/v1", userRouter);
app.use("/api/v1/auth", rateLimiters.auth, authRouter);
app.use("/api/v1/incident", incedentRoutes);
app.use("/api/v1/report", allusereport);
app.use("/api/v1/admin", adminEvent);
app.use("/api/v1/user", createWeeklyReport);
app.use("/api/v1/thirdparty", thirdPartyRoutes);
app.use("/api/v1/chat", chatRoutes);

// Serve API documentation
app.use("/docs", express.static("public"));
app.get("/docs", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "swagger-ui.html"));
});

// Serve swagger.json for the documentation
app.get("/swagger.json", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "swagger.json"));
});

// Redirect root to documentation
app.get("/", (req, res) => {
  res.redirect("/docs");
});

app.post("/api/subscribe", async (req, res) => {
  try {
    const { userId, subscription } = req.body;

    await User.update(
      { pushSubscription: subscription },
      { where: { id: userId } }
    );

    console.log(`Push subscription saved for user: ${userId}`);
    res.json({ success: true });
  } catch (error) {
    console.error("Error saving subscription:", error);
    res.status(500).json({ error: "Failed to save subscription" });
  }
});

app.post("/api/unsubscribe", async (req, res) => {
  try {
    const { userId } = req.body;

    await User.update({ pushSubscription: null }, { where: { id: userId } });

    console.log(`Push subscription removed for user: ${userId}`);
    res.json({ success: true });
  } catch (error) {
    console.error("Error removing subscription:", error);
    res.status(500).json({ error: "Failed to remove subscription" });
  }
});

handleChatSocketEvents(io);

app.use(ErrorHandlerMiddleware);

(async () => {
  try {
    await db.sync();
    await initializeDatabases();
    server.listen(port, () => {
      console.log(`🚀 Server listening on port ${port}`);
    });
  } catch (error) {
    console.log(error.message);
  }
})();
