import Chat from "../models/chat/chat.js";
import { ChatService } from "../service/chat.service.js";
import webpush from "web-push";
import { User } from "../models/auth/index.js";

const chatService = new ChatService();

// Configure VAPID keys with error checking
console.log("VAPID Configuration:", {
  email: process.env.VAPID_EMAIL ? "Set" : "Missing",
  publicKey: process.env.VAPID_PUBLIC_KEY ? "Set" : "Missing",
  privateKey: process.env.VAPID_PRIVATE_KEY ? "Set" : "Missing",
});

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Push notification service
const sendPushNotification = async (subscription, payload) => {
  try {
    console.log("📤 Attempting to send push notification:", {
      endpoint: subscription.endpoint?.substring(0, 50) + "...",
      payload: payload,
    });

    await webpush.sendNotification(subscription, JSON.stringify(payload));
    console.log("✅ Push notification sent successfully");
    return true;
  } catch (error) {
    console.error("❌ Push notification error:", error);

    // If subscription is invalid (410), it should be removed from database
    if (error.statusCode === 410) {
      console.log("🗑️ Subscription is invalid (410), marking for removal");
      return "invalid_subscription";
    }
    return false;
  }
};

// Updated notification function with proper debugging
const sendNotificationToRecipients = async (
  chatId,
  senderId,
  message,
  chatService
) => {
  console.log("🔔 Starting notification process for chat:", chatId);

  try {
    // FIXED: Use proper MongoDB query since Chat is a MongoDB model
    const chat = await Chat.findById(chatId);
    if (!chat) {
      console.log("❌ Chat not found:", chatId);
      return;
    }

    // Get sender details for notification (User is Sequelize, so use findByPk)
    const sender = await User.findByPk(senderId, {
      attributes: ["id", "firstName", "lastName"],
    });

    if (!sender) {
      console.log("❌ Sender not found:", senderId);
      return;
    }

    const senderName = `${sender.firstName} ${sender.lastName}`;
    console.log("👤 Sender:", senderName);

    const recipients = chat.participants.filter(
      (participant) =>
        participant.userId.toString() !== senderId && participant.isActive
    );

    console.log("📬 Found recipients:", recipients.length);

    for (const recipient of recipients) {
      const recipientId = recipient.userId.toString();
      console.log(`🔍 Processing recipient: ${recipientId}`);

      // Check if user has unseen messages and notifications enabled
      const hasUnseen = await chatService.hasUnseenMessages(
        chatId,
        recipientId
      );
      if (!hasUnseen) {
        console.log(
          `🔇 User ${recipientId} has muted notifications or no unseen messages`
        );
        continue;
      }

      // Get recipient user data including push subscription (User is Sequelize)
      const recipientUser = await User.findByPk(recipientId);

      if (!recipientUser) {
        console.log(`❌ Recipient user not found: ${recipientId}`);
        continue;
      }

      console.log(
        `📱 Push subscription exists for ${recipientId}:`,
        !!recipientUser.pushSubscription
      );

      if (recipientUser && recipientUser.pushSubscription) {
        // Send push notification
        const payload = {
          title: senderName,
          body: message.content,
          icon: "/icon-192x192.png",
          badge: "/badge-72x72.png",
          data: {
            chatId: chatId,
            messageId: message._id,
            senderId: senderId,
            url: `/chat/${chatId}`,
          },
        };

        console.log(`📤 Sending push notification to ${recipientId}:`, payload);

        const result = await sendPushNotification(
          recipientUser.pushSubscription,
          payload
        );

        if (result === "invalid_subscription") {
          // FIXED: Use proper Sequelize syntax to remove invalid subscription
          await User.update(
            { pushSubscription: null },
            { where: { id: recipientId } }
          );
          console.log(
            `🗑️ Removed invalid push subscription for user: ${recipientId}`
          );
        } else if (result) {
          console.log(`✅ Push notification sent to user: ${recipientId}`);
        } else {
          console.log(
            `❌ Failed to send push notification to user: ${recipientId}`
          );
        }
      } else {
        console.log(`📵 No push subscription found for user: ${recipientId}`);
      }
    }
  } catch (error) {
    console.error("💥 Error sending notifications:", error);
  }
};

export const handleChatSocketEvents = (io) => {
  const userSockets = new Map();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("authenticate", (userData) => {
      const { userId } = userData;
      socket.userId = userId;
      userSockets.set(userId, socket.id);
      console.log(`User ${userId} authenticated with socket ${socket.id}`);
    });

    socket.on("join_chat", async (data) => {
      const { chatId } = data;
      const userId = socket.userId;

      if (!userId) {
        socket.emit("error", { message: "User not authenticated" });
        return;
      }

      try {
        // FIXED: Use proper MongoDB query for Chat model
        const chat = await Chat.findOne({
          _id: chatId,
          "participants.userId": userId,
          "participants.isActive": true,
        });

        if (!chat) {
          socket.emit("error", { message: "Chat not found or access denied" });
          return;
        }

        socket.join(chatId);

        // Update last seen
        await chatService.updateLastSeen(chatId, userId);

        socket.emit("joined_chat", {
          chatId,
          message: "Successfully joined chat",
        });

        socket.to(chatId).emit("user_online", {
          userId,
          chatId,
          timestamp: new Date().toISOString(),
        });

        console.log(`User ${userId} joined chat room: ${chatId}`);
      } catch (error) {
        console.error("Error joining chat:", error);
        socket.emit("error", { message: "Failed to join chat" });
      }
    });

    socket.on("leave_chat", async (data) => {
      const { chatId } = data;
      const userId = socket.userId;

      if (!userId) {
        socket.emit("error", { message: "User not authenticated" });
        return;
      }

      try {
        socket.leave(chatId);
        await chatService.updateLastSeen(chatId, userId);

        socket.to(chatId).emit("user_offline", {
          userId,
          chatId,
          timestamp: new Date().toISOString(),
        });

        socket.emit("left_chat", {
          chatId,
          message: "Successfully left chat",
        });

        console.log(`User ${userId} left chat room: ${chatId}`);
      } catch (error) {
        console.error("Error leaving chat:", error);
        socket.emit("error", { message: "Failed to leave chat" });
      }
    });

    socket.on("send_message", async (data) => {
      const {
        chatId,
        content,
        messageType = "text",
        replyTo,
        fileData,
        mentions,
      } = data;
      const userId = socket.userId;

      if (!userId) {
        socket.emit("error", { message: "User not authenticated" });
        return;
      }

      if (!content || !content.trim()) {
        socket.emit("error", { message: "Message content is required" });
        return;
      }

      try {
        const additionalData = {};
        if (replyTo) additionalData.replyTo = replyTo;
        if (fileData) additionalData.fileData = fileData;
        if (mentions) additionalData.mentions = mentions;

        const message = await chatService.createMessage(
          chatId,
          userId,
          content,
          messageType,
          additionalData
        );

        const populatedMessage = await chatService.getPopulatedMessage(
          message._id
        );

        io.to(chatId).emit("new_message", populatedMessage);

        // Send push notifications
        console.log(
          "🚀 Triggering push notifications for message:",
          message._id
        );
        await sendNotificationToRecipients(
          chatId,
          userId,
          populatedMessage,
          chatService
        );

        socket.emit("message_delivered", {
          messageId: message._id,
          tempId: data.tempId,
        });

        console.log(`Message sent to chat ${chatId}:`, content);
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("message_error", {
          error: error.message || "Failed to send message",
          tempId: data.tempId,
        });
      }
    });

    socket.on("add_reaction", async (data) => {
      const { messageId, emoji } = data;
      const userId = socket.userId;

      try {
        const message = await chatService.addReaction(messageId, userId, emoji);
        const populatedMessage = await chatService.getPopulatedMessage(
          message._id
        );

        io.to(message.chatId).emit("reaction_added", populatedMessage);
      } catch (error) {
        console.error("Error adding reaction:", error);
        socket.emit("error", { message: "Failed to add reaction" });
      }
    });

    socket.on("edit_message", async (data) => {
      const { messageId, content } = data;
      const userId = socket.userId;

      try {
        const message = await chatService.editMessage(
          messageId,
          userId,
          content
        );
        const populatedMessage = await chatService.getPopulatedMessage(
          message._id
        );

        io.to(message.chatId).emit("message_edited", populatedMessage);
      } catch (error) {
        console.error("Error editing message:", error);
        socket.emit("error", { message: "Failed to edit message" });
      }
    });

    socket.on("delete_message", async (data) => {
      const { messageId } = data;
      const userId = socket.userId;

      try {
        const message = await chatService.deleteMessage(messageId, userId);
        io.to(message.chatId).emit("message_deleted", { messageId });
      } catch (error) {
        console.error("Error deleting message:", error);
        socket.emit("error", { message: "Failed to delete message" });
      }
    });

    socket.on("typing_start", (data) => {
      const { chatId } = data;
      const userId = socket.userId;
      socket.to(chatId).emit("user_typing", { userId, isTyping: true });
    });

    socket.on("typing_stop", (data) => {
      const { chatId } = data;
      const userId = socket.userId;
      socket.to(chatId).emit("user_typing", { userId, isTyping: false });
    });

    socket.on("mark_message_read", async (data) => {
      const { messageId, chatId } = data;
      const userId = socket.userId;

      try {
        await chatService.markMessageAsRead(messageId, userId);
        socket.to(chatId).emit("message_read", { messageId, userId });
      } catch (error) {
        console.error("Error marking message as read:", error);
      }
    });

    socket.on("disconnect", () => {
      const userId = socket.userId;

      if (userId) {
        userSockets.delete(userId);

        const rooms = Array.from(socket.rooms).filter(
          (room) => room !== socket.id
        );

        rooms.forEach((chatId) => {
          socket.to(chatId).emit("user_offline", {
            userId,
            chatId,
            timestamp: new Date().toISOString(),
          });
        });

        console.log(`User ${userId} disconnected from socket ${socket.id}`);
      }

      console.log("User disconnected:", socket.id);
    });
  });
};
