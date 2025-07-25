import { io } from "socket.io-client";

// === CONFIGURATION ===
const SERVER_URL = "https://r-report-v1.onrender.com"; // Change to your backend URL/port
const USER_ID = "34"; // Use user ID 6
// const CHAT_ID = "686e902e776cb0e814940d8b"; // Replace with a real chat ID

const socket = io(SERVER_URL, {
  transports: ["websocket", "polling"],
  timeout: 10000,
});

socket.on("connect", () => {
  console.log("✅ Connected to socket server");
  socket.emit("authenticate", { userId: USER_ID });
  console.log("🔐 Authentication sent");
});

socket.on("disconnect", () => {
  console.log("🔌 Disconnected from socket server");
});

socket.on("last_message", (data) => {
  console.log("🟢 last_message event received:", data);
});

socket.on("new_message", (data) => {
  console.log("🟢 new_message event received:", data);
});

socket.on("message_delivered", (data) => {
  console.log("🟢 message_delivered event received:", data);
});

socket.on("online_users_list", (data) => {
  console.log("🟢 online_users_list event received:", data);
});

socket.on("user_global_status", (data) => {
  console.log("🟢 user_global_status event received:", data);
});

// Join a chat after 2 seconds
setTimeout(() => {
  socket.emit("join_chat", { chatId: "686e902e776cb0e814940d8b" });
  console.log("➡️ join_chat emitted for", "686e902e776cb0e814940d8b");
}, 2000);

// Leave the chat after 10 seconds
setTimeout(() => {
  socket.emit("leave_chat", { chatId: "686e902e776cb0e814940d8b" });
  console.log("⬅️ leave_chat emitted for", "686e902e776cb0e814940d8b");
}, 10000);

// Keep the process alive
setInterval(() => {}, 1000);
