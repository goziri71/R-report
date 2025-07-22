import Chat from "../models/chat/chat.js";
import Message from "../models/chat/message.js";
import { ChatService } from "../service/chat.service.js";
import webpush from "web-push";
import { User } from "../models/auth/index.js"; // Make sure this import exists

const chatService = new ChatService();

// Configure VAPID keys
webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Push notification service
const sendPushNotification = async (subscription, payload) => {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.error("Push notification error:", error);
    // If subscription is invalid (410), it should be removed from database
    if (error.statusCode === 410) {
      return "invalid_subscription";
    }
    return false;
  }
};

// Updated notification function that works with your ChatService
const sendNotificationToRecipients = async (
  chatId,
  senderId,
  message,
  onlineUsers
) => {
  try {
    console.log("🔔 === NOTIFICATION DEBUG START ===");
    console.log("Chat ID:", chatId);
    console.log("Sender ID:", senderId);

    // Get chat participants (excluding sender)
    const chat = await Chat.findById(chatId);
    if (!chat) {
      console.log("❌ Chat not found:", chatId);
      return;
    }

    // Get sender details for notification
    const sender = await User.findByPk(senderId, {
      attributes: ["id", "firstName", "lastName"],
    });

    if (!sender) {
      console.log("❌ Sender not found:", senderId);
      return;
    }

    const senderName = `${sender.firstName} ${sender.lastName}`;
    console.log("✅ Sender found:", senderName);

    const recipients = chat.participants.filter(
      // (participant) =>
      //   participant.userId.toString() !== senderId && participant.isActive
      (participant) => {
        const participantUserId = participant.userId.toString();
        const senderUserId = senderId.toString();

        return participantUserId !== senderUserId && participant.isActive;
      }
    );

    console.log("📬 Recipients found:", recipients.length);

    for (const recipient of recipients) {
      const recipientId = recipient.userId.toString();
      console.log(`\n🔍 === Processing recipient: ${recipientId} ===`);

      // const recipientSocketId = userSockets.get(recipientId);
      // const isInChatRoom = recipientSocketId
      //   ? io.sockets.sockets.get(recipientSocketId)?.rooms?.has(chatId)
      //   : false;

      // if (isInChatRoom) {
      //   console.log(
      //     `⏭️ Skipping notification - recipient ${recipientId} is in chat room ${chatId}`
      //   );
      //   continue;
      // }

      // Skip the hasUnseenMessages check since it might be blocking notifications
      // The unread count increment happens after message creation, so this check might be premature

      // Get recipient user data including push subscription
      const recipientUser = await User.findByPk(recipientId);

      if (!recipientUser) {
        console.log(`❌ Recipient user not found: ${recipientId}`);
        continue;
      }

      console.log(
        `📱 Has push subscription: ${!!recipientUser.pushSubscription}`
      );

      // Check if notifications are muted directly from the chat participant
      const participantSettings = recipient.notificationSettings;
      if (participantSettings?.muted) {
        console.log(`🔇 Notifications muted for user: ${recipientId}`);
        continue;
      }

      if (recipientUser && recipientUser.pushSubscription) {
        // Send push notification
        const payload = {
          title: senderName,
          body: message.content,
          icon: "http://localhost:4000/public/images/",
          badge: "/images/redbiller.png",
          currentUserId: recipientId,
          data: {
            chatId: chatId,
            messageId: message._id,
            senderId: senderId,
            url: `/chat/${chatId}`,
          },
        };

        const result = await sendPushNotification(
          recipientUser.pushSubscription,
          payload
        );

        if (result === "invalid_subscription") {
          // Remove invalid subscription
          await User.update(
            { pushSubscription: null },
            { where: { id: recipientId } }
          );
          console.log(
            `🗑️ Removed invalid push subscription for user: ${recipientId}`
          );
        } else if (result) {
          console.log(
            `✅ Push notification sent successfully to user: ${recipientId}`
          );
        } else {
          console.log(
            `❌ Failed to send push notification to user: ${recipientId}`
          );
        }
      } else {
        console.log(`📵 No push subscription found for user: ${recipientId}`);
      }
    }

    console.log("🔔 === NOTIFICATION DEBUG END ===\n");
  } catch (error) {
    console.error("💥 Error sending notifications:", error);
  }
};

export const handleChatSocketEvents = (io) => {
  const userSockets = new Map();
  const onlineUsers = new Map(); // userId -> { socketId, status, lastSeen }

  // Helper function to broadcast user status to all connected users
  const broadcastUserStatus = (userId, status) => {
    const timestamp = new Date().toISOString();

    // Broadcast to all connected users
    io.emit("user_global_status", {
      userId,
      status, // 'online', 'offline', 'away', 'busy'
      timestamp,
    });

    console.log(`Broadcasting global status: User ${userId} is ${status}`);
  };

  // Helper function to get all online users
  const getOnlineUsers = () => {
    const online = [];
    onlineUsers.forEach((data, userId) => {
      if (data.status === "online") {
        online.push({
          userId,
          status: data.status,
          lastSeen: data.lastSeen,
        });
      }
    });
    return online;
  };

  // Helper function to send the last message for a chat
  const sendLastMessage = async (io, chatId) => {
    // Fetch the last message of the chat
    const chat = await Chat.findById(chatId);
    const lastMessageId = chat?.lastMessageId;
    const message = await Message.findById(lastMessageId);

    if (message) {
      io.to(chatId).emit("last_message", {
        chatId,
        lastMessage: message.content,
        timestamp: message.createdAt,
      });
    }
  };

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("authenticate", (userData) => {
      const { userId } = userData;
      socket.userId = userId;
      userSockets.set(userId, socket.id);

      // Set user as online
      onlineUsers.set(userId, {
        socketId: socket.id,
        status: "online",
        lastSeen: new Date(),
      });

      // Broadcast that user is online
      broadcastUserStatus(userId, "online");

      // Send current online users to the newly connected user
      socket.emit("online_users_list", getOnlineUsers());

      // Send last messages for all chats user is part of
      const userChats = Chat.find({ "participants.userId": userId });
      userChats.forEach((chat) => {
        // Send the last message for each chat
        sendLastMessage(io, chat._id);
      });

      console.log(`User ${userId} authenticated with socket ${socket.id}`);
    });

    // Event: Get online users
    socket.on("get_online_users", () => {
      socket.emit("online_users_list", getOnlineUsers());
    });

    // Event: Check if specific user is online
    socket.on("check_user_status", (data) => {
      const { userId: targetUserId } = data;
      const userStatus = onlineUsers.get(targetUserId);

      socket.emit("user_status_response", {
        userId: targetUserId,
        isOnline: !!userStatus && userStatus.status === "online",
        status: userStatus ? userStatus.status : "offline",
        lastSeen: userStatus ? userStatus.lastSeen : null,
      });
    });

    // Event: Update user status (online, away, busy, etc.)
    socket.on("update_status", (data) => {
      const { status } = data; // 'online', 'away', 'busy', 'do_not_disturb'
      const userId = socket.userId;

      if (!userId) {
        socket.emit("error", { message: "User not authenticated" });
        return;
      }

      // Update user status
      if (onlineUsers.has(userId)) {
        onlineUsers.get(userId).status = status;
        onlineUsers.get(userId).lastSeen = new Date();
      }

      // Broadcast status change
      broadcastUserStatus(userId, status);

      socket.emit("status_updated", {
        status,
        timestamp: new Date().toISOString(),
      });
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

        socket.to(chatId).emit("user_online", {
          userId,
          chatId,
          timestamp: new Date().toISOString(),
        });

        console.log(`User ${userId} joined chat room: ${chatId}`);

        // After user joins, send the last message and unread count
        sendLastMessage(io, chatId); // Send last message
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

        // Send push notifications
        await sendNotificationToRecipients(
          chatId,
          userId,
          populatedMessage,
          chatService,
          onlineUsers
        );

        // Update last message in the chat
        await Chat.findByIdAndUpdate(chatId, {
          lastMessageId: message._id,
          updatedAt: new Date(),
        });

        // Send last message to all users (real-time)
        sendLastMessage(io, chatId); // Update last message in real-time

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

    socket.on("disconnect", () => {
      const userId = socket.userId;

      if (userId) {
        // Remove from tracking maps
        userSockets.delete(userId);
        onlineUsers.delete(userId);

        // Broadcast that user is offline globally
        broadcastUserStatus(userId, "offline");

        // Handle chat-specific offline notifications
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
