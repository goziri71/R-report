import Chat from "../models/chat/chat.js";
import { ChatService } from "../service/chat.service.js";
import webpush from "web-push";
import { User } from "../models/auth/index.js";
import storageClient from "../supabase/index.js";

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

    const chat = await Chat.findById(chatId);
    if (!chat) {
      console.log("❌ Chat not found:", chatId);
      return;
    }

    const sender = await User.findByPk(senderId, {
      attributes: ["id", "firstName", "lastName"],
    });

    if (!sender) {
      console.log("❌ Sender not found:", senderId);
      return;
    }

    const senderName = `${sender.firstName} ${sender.lastName}`;
    console.log("✅ Sender found:", senderName);

    const recipients = chat.participants.filter((participant) => {
      const participantUserId = participant.userId.toString();
      const senderUserId = senderId.toString();
      return participantUserId !== senderUserId && participant.isActive;
    });

    console.log("📬 Recipients found:", recipients.length);

    for (const recipient of recipients) {
      const recipientId = recipient.userId.toString();
      console.log(`\n🔍 === Processing recipient: ${recipientId} ===`);

      const recipientUser = await User.findByPk(recipientId);

      if (!recipientUser) {
        console.log(`❌ Recipient user not found: ${recipientId}`);
        continue;
      }

      console.log(
        `📱 Has push subscription: ${!!recipientUser.pushSubscription}`
      );

      const participantSettings = recipient.notificationSettings;
      if (participantSettings?.muted) {
        console.log(`🔇 Notifications muted for user: ${recipientId}`);
        continue;
      }

      if (recipientUser && recipientUser.pushSubscription) {
        const unreadCount = await chatService.getUnreadMessagesCount(
          chatId,
          recipientId
        );
        const payload = {
          title: senderName,
          body: message.content,
          unreadCount: unreadCount,
          chatId: chatId,
          icon: "/images/redbiller.png",
          badge: "/images/redbiller.png",
          currentUserId: recipientId,
          data: {
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

// NEW: Helper function to send last_message updates to users not in chat room
const sendLastMessageUpdate = async (
  io,
  userSockets,
  chatId,
  excludeUserId = null
) => {
  try {
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.lastMessageId) return;

    const lastMessage = await chatService.getPopulatedMessage(
      chat.lastMessageId
    );
    if (!lastMessage) return;

    // Get all participants except the excluded user (usually the sender)
    const recipients = chat.participants.filter(
      (participant) =>
        participant.isActive &&
        (!excludeUserId ||
          participant.userId.toString() !== excludeUserId.toString())
    );

    // Debug: Check userSockets Map once for this update
    console.log(
      `🔍 [last_message debug] userSockets Map size: ${userSockets.size}`
    );
    console.log(
      `🔍 [last_message debug] userSockets keys: ${Array.from(
        userSockets.keys()
      ).join(", ")}`
    );

    for (const recipient of recipients) {
      const recipientId = recipient.userId.toString();

      // Debug: Check the exact types and values
      console.log(
        `🔍 [last_message debug] recipient.userId type: ${typeof recipient.userId}, value: ${
          recipient.userId
        }`
      );
      console.log(
        `🔍 [last_message debug] recipientId type: ${typeof recipientId}, value: ${recipientId}`
      );
      console.log(
        `🔍 [last_message debug] userSockets Map keys types:`,
        Array.from(userSockets.keys()).map((key) => `${typeof key}:${key}`)
      );

      const recipientSocketId = userSockets.get(recipientId);

      // Skip users who are not online (not in userSockets Map)
      if (!recipientSocketId) {
        console.log(
          `[last_message debug] User ${recipientId} is offline, skipping real-time update`
        );
        continue;
      }

      console.log(
        `🔍 [last_message debug] Looking for recipientId: ${recipientId}`
      );
      console.log(
        `🔍 [last_message debug] Found socketId: ${recipientSocketId}`
      );

      const recipientSocket = recipientSocketId
        ? io.sockets.sockets.get(recipientSocketId)
        : null;
      const isInChatRoom = recipientSocket?.rooms?.has(chatId);

      console.log(
        `[last_message debug] recipientId=${recipientId}, socketId=${recipientSocketId}, isInChatRoom=${isInChatRoom}, rooms=${
          recipientSocket ? Array.from(recipientSocket.rooms).join(",") : "N/A"
        }`
      );

      if (!isInChatRoom && recipientSocket) {
        // Get updated chat data with unread count
        const userChats = await chatService.getUserChats(recipientId);
        const chatData = userChats.find((c) => c._id.toString() === chatId);

        if (chatData) {
          // Send real-time last message update
          recipientSocket.emit("last_message_update", {
            chatId: chatId,
            message: lastMessage,
            unreadCount: chatData.unreadCount || 0,
            chatType: chatData.chatType,
            chatName: chatData.metadata?.name || "Unknown Chat",
            recipientName: chatData.metadata?.recipientName || null,
          });

          console.log(
            `🔄 Sent real-time last_message_update to user ${recipientId} for chat ${chatId}`
          );
        }
      } else {
        console.log(
          `[last_message debug] Skipped user ${recipientId}: ${
            !recipientSocket ? "No socket" : "In chat room"
          }`
        );
      }
    }
  } catch (error) {
    console.error("Error sending last_message update:", error);
  }
};

export const handleChatSocketEvents = (io) => {
  const userSockets = new Map();
  const onlineUsers = new Map();

  const broadcastUserStatus = (userId, status) => {
    const timestamp = new Date().toISOString();
    io.emit("user_global_status", {
      userId,
      status,
      timestamp,
    });
    console.log(`Broadcasting global status: User ${userId} is ${status}`);
  };

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

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("authenticate", async (userData) => {
      const { userId } = userData;

      // Remove any existing socket for this user (prevent duplicates)
      const existingSocketId = userSockets.get(userId);
      if (existingSocketId) {
        console.log(
          `🔄 Replacing existing socket for user ${userId}: ${existingSocketId} -> ${socket.id}`
        );
      }

      socket.userId = userId;
      userSockets.set(userId, socket.id);

      // Debug: Check if userSockets is working
      console.log(`🔐 Authentication: User ${userId} with socket ${socket.id}`);
      console.log(`🔍 userSockets Map size: ${userSockets.size}`);
      console.log(`🔍 userSockets.get(${userId}): ${userSockets.get(userId)}`);

      onlineUsers.set(userId, {
        socketId: socket.id,
        status: "online",
        lastSeen: new Date(),
      });

      broadcastUserStatus(userId, "online");
      socket.emit("online_users_list", getOnlineUsers());
      socket.emit("authenticated", { userId });

      console.log(`User ${userId} authenticated with socket ${socket.id}`);

      // Send initial last messages
      setTimeout(async () => {
        try {
          const userChats = await chatService.getUserChats(userId);
          console.log(`📨 Found ${userChats.length} chats for user ${userId}`);

          for (const chat of userChats) {
            const chatId = chat._id.toString();
            const isInChatRoom = socket.rooms.has(chatId);

            console.log(
              `Chat ${chatId}: inRoom=${isInChatRoom}, hasLastMessage=${!!chat.lastMessageId}`
            );

            if (!isInChatRoom && chat.lastMessageId) {
              try {
                const lastMessage = await chatService.getPopulatedMessage(
                  chat.lastMessageId
                );

                if (lastMessage) {
                  socket.emit("last_message", {
                    chatId: chatId,
                    message: lastMessage,
                    unreadCount: chat.unreadCount || 0,
                    chatType: chat.chatType,
                    chatName: chat.metadata?.name || "Unknown Chat",
                    recipientName: chat.metadata?.recipientName || null,
                  });

                  console.log(
                    `✅ Sent last message for chat ${chatId} to user ${userId}`
                  );
                } else {
                  console.log(`❌ No last message found for chat ${chatId}`);
                }
              } catch (messageError) {
                console.error(
                  `Error getting message for chat ${chatId}:`,
                  messageError
                );
              }
            }
          }
        } catch (error) {
          console.error("Error sending initial last messages:", error);
        }
      }, 500);
    });

    // Real-time last message updates (no manual request needed)
    socket.on("subscribe_to_last_messages", async () => {
      const userId = socket.userId;

      if (!userId) {
        socket.emit("error", { message: "User not authenticated" });
        return;
      }

      console.log(`🔔 User ${userId} subscribed to real-time last messages`);

      // Send initial last messages for all chats
      try {
        const userChats = await chatService.getUserChats(userId);

        for (const chat of userChats) {
          if (chat.lastMessageId) {
            const lastMessage = await chatService.getPopulatedMessage(
              chat.lastMessageId
            );
            if (lastMessage) {
              socket.emit("last_message_update", {
                chatId: chat._id.toString(),
                message: lastMessage,
                unreadCount: chat.unreadCount || 0,
                chatType: chat.chatType,
                chatName: chat.metadata?.name || "Unknown Chat",
                recipientName: chat.metadata?.recipientName || null,
              });
            }
          }
        }
      } catch (error) {
        console.error("Error sending initial last messages:", error);
      }
    });

    // Keep the old get_last_message for backward compatibility
    socket.on("get_last_message", async (chatId) => {
      const userId = socket.userId;

      if (!userId) {
        socket.emit("error", { message: "User not authenticated" });
        return;
      }

      console.log(
        `🔍 get_last_message requested for chat ${chatId} by user ${userId}`
      );

      const isInChatRoom = socket.rooms.has(chatId);
      if (isInChatRoom) {
        console.log(
          `User ${userId} is in chat room ${chatId}, skipping last message fetch.`
        );
        return;
      }

      try {
        const userChats = await chatService.getUserChats(userId);
        const chatData = userChats.find((c) => c._id.toString() === chatId);

        if (!chatData) {
          console.log(`❌ Chat ${chatId} not found for user ${userId}`);
          socket.emit("error", { message: "Chat not found or access denied" });
          return;
        }

        if (!chatData.lastMessageId) {
          console.log(`❌ No last message ID for chat ${chatId}`);
          socket.emit("last_message", {
            chatId,
            message: null,
            unreadCount: 0,
            chatType: chatData.chatType,
            chatName: chatData.metadata?.name || "Unknown Chat",
            recipientName: chatData.metadata?.recipientName || null,
          });
          return;
        }

        const lastMessage = await chatService.getPopulatedMessage(
          chatData.lastMessageId
        );

        if (!lastMessage) {
          console.log(
            `❌ Last message not found for ID ${chatData.lastMessageId}`
          );
          socket.emit("last_message", {
            chatId,
            message: null,
            unreadCount: 0,
            chatType: chatData.chatType,
            chatName: chatData.metadata?.name || "Unknown Chat",
            recipientName: chatData.metadata?.recipientName || null,
          });
          return;
        }

        socket.emit("last_message", {
          chatId,
          message: lastMessage,
          unreadCount: chatData.unreadCount || 0,
          chatType: chatData.chatType,
          chatName: chatData.metadata?.name || "Unknown Chat",
          recipientName: chatData.metadata?.recipientName || null,
        });

        console.log(
          `✅ Last message sent to user ${userId} for chat ${chatId}`
        );
      } catch (error) {
        console.error("Error fetching last message:", error);
        socket.emit("error", { message: "Failed to fetch last message" });
      }
    });

    socket.on("get_online_users", () => {
      socket.emit("online_users_list", getOnlineUsers());
    });

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

    socket.on("update_status", (data) => {
      const { status } = data;
      const userId = socket.userId;

      if (!userId) {
        socket.emit("error", { message: "User not authenticated" });
        return;
      }

      if (onlineUsers.has(userId)) {
        onlineUsers.get(userId).status = status;
        onlineUsers.get(userId).lastSeen = new Date();
      }

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

        // Update last seen and reset unread count
        await chatService.updateLastSeen(chatId, userId);
        await chatService.resetUnreadCount(chatId, userId);

        socket.emit("joined_chat", {
          chatId,
          message: "Successfully joined chat",
        });

        socket.to(chatId).emit("user_online", {
          userId,
          chatId,
          timestamp: new Date().toISOString(),
        });

        // NEW: Send updated last_message to other users not in this chat
        await sendLastMessageUpdate(io, userSockets, chatId, userId);

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

        // NEW: Send updated last_message to this user since they left the chat
        setTimeout(async () => {
          await sendLastMessageUpdate(io, userSockets, chatId);
        }, 100);

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

        await sendNotificationToRecipients(
          chatId,
          userId,
          populatedMessage,
          onlineUsers
        );

        // NEW: Send last_message update to users NOT in the chat room
        await sendLastMessageUpdate(io, userSockets, chatId, userId);

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

        // NEW: Update last_message if this was the last message
        const chat = await Chat.findById(message.chatId);
        if (
          chat &&
          chat.lastMessageId &&
          chat.lastMessageId.toString() === messageId
        ) {
          await sendLastMessageUpdate(io, userSockets, message.chatId, userId);
        }
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

        // NEW: Update last_message if this was the last message
        const chat = await Chat.findById(message.chatId);
        if (
          chat &&
          chat.lastMessageId &&
          chat.lastMessageId.toString() === messageId
        ) {
          await sendLastMessageUpdate(io, userSockets, message.chatId, userId);
        }
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

        // NEW: Update last_message if this was the last message
        const chat = await Chat.findById(message.chatId);
        if (
          chat &&
          chat.lastMessageId &&
          chat.lastMessageId.toString() === messageId
        ) {
          await sendLastMessageUpdate(io, userSockets, message.chatId, userId);
        }
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

        // NEW: Send updated last_message to users not in chat (unread count changed)
        await sendLastMessageUpdate(io, userSockets, chatId, userId);
      } catch (error) {
        console.error("Error marking message as read:", error);
      }
    });

    // Voice note socket events
    socket.on("send_voice_note", async (data) => {
      const { chatId, audioData, duration } = data;
      const userId = socket.userId;

      if (!userId) {
        socket.emit("error", { message: "User not authenticated" });
        return;
      }

      try {
        // Convert base64 to buffer
        const audioBuffer = Buffer.from(audioData, "base64");

        // Generate unique filename for this chat and user
        const timestamp = Date.now();
        const fileName = `chat_${chatId}/user_${userId}/${timestamp}_voice.webm`;

        // Upload to your existing Supabase bucket
        const { data: uploadData, error } = await storageClient
          .from("voice-notes") // Use your existing bucket or create 'voice-notes' bucket
          .upload(fileName, audioBuffer, {
            contentType: "audio/webm",
            metadata: {
              chatId,
              userId,
              duration: duration || 0,
              timestamp,
            },
          });

        if (error) {
          throw new Error(`Upload failed: ${error.message}`);
        }

        // Get the public URL
        const { data: urlData } = storageClient
          .from("voice-notes")
          .getPublicUrl(fileName);

        // Create message with voice note data
        const messageContent = `🎤 Voice Note (${Math.round(duration || 0)}s)`;
        const additionalData = {
          fileData: {
            filename: fileName,
            size: audioBuffer.length,
            mimeType: "audio/webm",
            url: urlData.publicUrl,
            duration: duration || 0,
            timestamp: timestamp,
          },
        };

        const message = await chatService.createMessage(
          chatId,
          userId,
          messageContent,
          "voice", // Use 'voice' instead of 'voice_note' to match your model
          additionalData
        );

        const populatedMessage = await chatService.getPopulatedMessage(
          message._id
        );

        // Broadcast to chat room
        io.to(chatId).emit("new_message", populatedMessage);

        // Send delivery confirmation
        socket.emit("voice_note_delivered", {
          messageId: message._id,
          tempId: data.tempId,
          filename: fileName,
          url: urlData.publicUrl,
        });

        // NEW: Update last_message for users not in chat room
        await sendLastMessageUpdate(io, userSockets, chatId, userId);

        console.log(
          `🎤 Voice note uploaded to chat ${chatId} by user ${userId}`
        );
      } catch (error) {
        console.error("Error sending voice note:", error);
        socket.emit("voice_note_error", {
          error: error.message || "Failed to send voice note",
          tempId: data.tempId,
        });
      }
    });

    // Generate a signed URL for a voice note file
    socket.on("get_voice_note_url", async (data) => {
      console.log("get_voice_note_url called", data);
      const { filePath } = data;
      try {
        const { data: signedData, error } = await storageClient
          .from("voice-notes")
          .createSignedUrl(filePath, 3600); // 1 hour expiry
        if (error) {
          socket.emit("voice_note_error", { error: error.message });
        } else {
          socket.emit("voice_note_url", {
            filePath,
            signedUrl: signedData.signedUrl,
          });
        }
      } catch (err) {
        socket.emit("voice_note_error", { error: err.message });
      }
    });

    socket.on("disconnect", () => {
      const userId = socket.userId;

      if (userId) {
        userSockets.delete(userId);
        onlineUsers.delete(userId);

        broadcastUserStatus(userId, "offline");

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
