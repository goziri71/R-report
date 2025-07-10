import { Router } from "express";
const router = Router();
import {
  createDirectMessage,
  createGroupChat,
  getUserChats,
  getChatMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  addParticipant,
  removeParticipant,
  updateNotificationSettings,
  markMessageAsRead,
  getUnreadMessagesCount,
} from "../../controllers/chat/chat.controller.js";
import { authorize } from "../../middleware/authorize.js";

// Chat management routes
router.post("/direct", authorize, createDirectMessage); // Create direct/individual chat
router.post("/group", authorize, createGroupChat); // Create group chat
router.get("/user", authorize, getUserChats); // Get user's chats
router.get("/:chatId/messages", authorize, getChatMessages); // Get chat messages
router.get("/:chatId/unread-count", authorize, getUnreadMessagesCount); // Get unread messages count for specific chat

// Message routes
router.post("/:chatId/message", authorize, sendMessage); // Send message
router.patch("/message/:messageId", authorize, editMessage); // Edit message
router.delete("/message/:messageId", authorize, deleteMessage); // Delete message
router.post("/message/:messageId/read", authorize, markMessageAsRead); // Mark message as read

// Reaction routes
router.post("/message/:messageId/reaction", authorize, addReaction); // Add reaction
router.delete("/message/:messageId/reaction", authorize, removeReaction); // Remove reaction

// Participant management (for group chats)
router.post("/:chatId/participants", authorize, addParticipant); // Add participant
router.delete("/:chatId/participants", authorize, removeParticipant); // Remove participant

// Settings
router.put("/:chatId/notifications", authorize, updateNotificationSettings); // Update notifications

export default router;
