import Chat from "../models/chat/chat.js";
import { ChatService } from "../service/chat.service.js";

const chatService = new ChatService();

const sendNotificationToRecipients = async (
  chatId,
  senderId,
  message,
  chatService
) => {
  try {
    // Get chat participants (excluding sender)
    const chat = await Chat.findById(chatId);
    if (!chat) return;

    // Get sender details for notification
    const sender = await User.findByPk(senderId, {
      attributes: ["id", "firstName", "lastName"],
    });

    const senderName = `${sender.firstName} ${sender.lastName}`;

    const recipients = chat.participants.filter(
      (participant) =>
        participant.userId.toString() !== senderId && participant.isActive
    );

    for (const recipient of recipients) {
      const recipientId = recipient.userId.toString();

      // Check if recipient has unseen messages and notifications aren't muted
      const hasUnseenMessages = await chatService.hasUnseenMessages(
        chatId,
        recipientId
      );

      if (hasUnseenMessages) {
        // Send push notification
        await sendPushNotification(recipientId, {
          title: senderName,
          body: message.content,
          data: {
            chatId: chatId,
            messageId: message._id,
            senderId: senderId,
            type: "new_message",
          },
        });

        console.log(
          `Notification sent to user with unseen messages: ${recipientId}`
        );
      } else {
        console.log(
          `No notification sent to user (no unseen messages or muted): ${recipientId}`
        );
      }
    }
  } catch (error) {
    console.error("Error sending notifications:", error);
  }
};

// Push notification service
const sendPushNotification = async (userId, notificationData) => {
  try {
    console.log(
      `Sending push notification to user ${userId}:`,
      notificationData
    );

    // Your push notification service implementation here
    //await fcm.sendToUser(userId, notificationData);
    // or
    // await oneSignal.sendNotification(userId, notificationData);

    return true;
  } catch (error) {
    console.error(`Failed to send push notification to user ${userId}:`, error);
    return false;
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
        socket.to(chatId).emit("user_online", { userId });

        console.log(`User ${userId} joined chat room: ${chatId}`);
      } catch (error) {
        console.error("Error joining chat:", error);
        socket.emit("error", { message: "Failed to join chat" });
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

        socket.rooms.forEach((room) => {
          if (room !== socket.id) {
            socket.to(room).emit("user_offline", { userId });
          }
        });
      }

      console.log("User disconnected:", socket.id);
    });
  });
};
