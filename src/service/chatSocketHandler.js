// import Chat from "../models/chat/chat.js";
// import { ChatService } from "../service/chat.service.js";
// import webpush from "web-push";
// import { User } from "../models/auth/index.js"; // Make sure this import exists

// const chatService = new ChatService();

// // Configure VAPID keys
// webpush.setVapidDetails(
//   `mailto:${process.env.VAPID_EMAIL}`,
//   process.env.VAPID_PUBLIC_KEY,
//   process.env.VAPID_PRIVATE_KEY
// );

// // Push notification service
// const sendPushNotification = async (subscription, payload) => {
//   try {
//     await webpush.sendNotification(subscription, JSON.stringify(payload));
//     return true;
//   } catch (error) {
//     console.error("Push notification error:", error);
//     // If subscription is invalid (410), it should be removed from database
//     if (error.statusCode === 410) {
//       return "invalid_subscription";
//     }
//     return false;
//   }
// };

// // Updated notification function that works with your ChatService
// const sendNotificationToRecipients = async (
//   chatId,
//   senderId,
//   message,
//   onlineUsers
// ) => {
//   try {
//     console.log("🔔 === NOTIFICATION DEBUG START ===");
//     console.log("Chat ID:", chatId);
//     console.log("Sender ID:", senderId);

//     // Get chat participants (excluding sender)
//     const chat = await Chat.findById(chatId);
//     if (!chat) {
//       console.log("❌ Chat not found:", chatId);
//       return;
//     }

//     // Get sender details for notification
//     const sender = await User.findByPk(senderId, {
//       attributes: ["id", "firstName", "lastName"],
//     });

//     if (!sender) {
//       console.log("❌ Sender not found:", senderId);
//       return;
//     }

//     const senderName = `${sender.firstName} ${sender.lastName}`;
//     console.log("✅ Sender found:", senderName);

//     const recipients = chat.participants.filter(
//       // (participant) =>
//       //   participant.userId.toString() !== senderId && participant.isActive
//       (participant) => {
//         const participantUserId = participant.userId.toString();
//         const senderUserId = senderId.toString();

//         return participantUserId !== senderUserId && participant.isActive;
//       }
//     );

//     console.log("📬 Recipients found:", recipients.length);

//     for (const recipient of recipients) {
//       const recipientId = recipient.userId.toString();
//       console.log(`\n🔍 === Processing recipient: ${recipientId} ===`);

//       // const recipientSocketId = userSockets.get(recipientId);
//       // const isInChatRoom = recipientSocketId
//       //   ? io.sockets.sockets.get(recipientSocketId)?.rooms?.has(chatId)
//       //   : false;

//       // if (isInChatRoom) {
//       //   console.log(
//       //     `⏭️ Skipping notification - recipient ${recipientId} is in chat room ${chatId}`
//       //   );
//       //   continue;
//       // }

//       // Skip the hasUnseenMessages check since it might be blocking notifications
//       // The unread count increment happens after message creation, so this check might be premature

//       // Get recipient user data including push subscription
//       const recipientUser = await User.findByPk(recipientId);

//       if (!recipientUser) {
//         console.log(`❌ Recipient user not found: ${recipientId}`);
//         continue;
//       }

//       console.log(
//         `📱 Has push subscription: ${!!recipientUser.pushSubscription}`
//       );

//       // Check if notifications are muted directly from the chat participant
//       const participantSettings = recipient.notificationSettings;
//       if (participantSettings?.muted) {
//         console.log(`🔇 Notifications muted for user: ${recipientId}`);
//         continue;
//       }

//       if (recipientUser && recipientUser.pushSubscription) {
//         // Send push notification
//         const payload = {
//           title: senderName,
//           body: message.content,
//           icon: "/images/redbiller.png",
//           badge: "/images/redbiller.png",
//           currentUserId: recipientId,
//           data: {
//             chatId: chatId,
//             messageId: message._id,
//             senderId: senderId,
//             url: `/chat/${chatId}`,
//           },
//         };

//         const result = await sendPushNotification(
//           recipientUser.pushSubscription,
//           payload
//         );

//         if (result === "invalid_subscription") {
//           // Remove invalid subscription
//           await User.update(
//             { pushSubscription: null },
//             { where: { id: recipientId } }
//           );
//           console.log(
//             `🗑️ Removed invalid push subscription for user: ${recipientId}`
//           );
//         } else if (result) {
//           console.log(
//             `✅ Push notification sent successfully to user: ${recipientId}`
//           );
//         } else {
//           console.log(
//             `❌ Failed to send push notification to user: ${recipientId}`
//           );
//         }
//       } else {
//         console.log(`📵 No push subscription found for user: ${recipientId}`);
//       }
//     }

//     console.log("🔔 === NOTIFICATION DEBUG END ===\n");
//   } catch (error) {
//     console.error("💥 Error sending notifications:", error);
//   }
// };

// export const handleChatSocketEvents = (io) => {
//   const userSockets = new Map();
//   const onlineUsers = new Map(); // userId -> { socketId, status, lastSeen }

//   // Helper function to broadcast user status to all connected users
//   const broadcastUserStatus = (userId, status) => {
//     const timestamp = new Date().toISOString();

//     // Broadcast to all connected users
//     io.emit("user_global_status", {
//       userId,
//       status, // 'online', 'offline', 'away', 'busy'
//       timestamp,
//     });

//     console.log(`Broadcasting global status: User ${userId} is ${status}`);
//   };

//   // Helper function to get all online users
//   const getOnlineUsers = () => {
//     const online = [];
//     onlineUsers.forEach((data, userId) => {
//       if (data.status === "online") {
//         online.push({
//           userId,
//           status: data.status,
//           lastSeen: data.lastSeen,
//         });
//       }
//     });
//     return online;
//   };

//   io.on("connection", (socket) => {
//     console.log("User connected:", socket.id);

//     socket.on("authenticate", (userData) => {
//       const { userId } = userData;
//       socket.userId = userId;
//       userSockets.set(userId, socket.id);

//       // Set user as online
//       onlineUsers.set(userId, {
//         socketId: socket.id,
//         status: "online",
//         lastSeen: new Date(),
//       });

//       // Broadcast that user is online
//       broadcastUserStatus(userId, "online");
//       // Send current online users to the newly connected user
//       socket.emit("online_users_list", getOnlineUsers());

//       console.log(`User ${userId} authenticated with socket ${socket.id}`);
//     });

//     socket.on("get_last_message", async (chatId) => {
//       const userId = socket.userId;

//       if (!userId) {
//         socket.emit("error", { message: "User not authenticated" });
//         return;
//       }

//       // Check if the user is already in the chat room
//       const isInChatRoom = socket.rooms.has(chatId); // Check if the user is in the chat room

//       if (isInChatRoom) {
//         console.log(
//           `User ${userId} is already in chat room ${chatId}, skipping last message fetch.`
//         );
//         return; // Skip fetching last message if the user is in the room
//       }

//       try {
//         // Fetch the chat document from the database
//         const chat = await Chat.findById(chatId).populate(
//           "participants.userId",
//           "firstName lastName"
//         );

//         if (!chat) {
//           socket.emit("error", { message: "Chat not found" });
//           return;
//         }

//         // Get the last message from the chat
//         const lastMessage = chat.messages[chat.messages.length - 1]; // Get the last message

//         // Send the last message to the user who requested it
//         socket.emit("last_message", lastMessage);
//         console.log(`Last message sent to user ${userId} for chat ${chatId}`);
//       } catch (error) {
//         console.error("Error fetching last message:", error);
//         socket.emit("error", { message: "Failed to fetch last message" });
//       }
//     });

//     // Event: Get online users
//     socket.on("get_online_users", () => {
//       socket.emit("online_users_list", getOnlineUsers());
//     });

//     // Event: Check if specific user is online
//     socket.on("check_user_status", (data) => {
//       const { userId: targetUserId } = data;
//       const userStatus = onlineUsers.get(targetUserId);

//       socket.emit("user_status_response", {
//         userId: targetUserId,
//         isOnline: !!userStatus && userStatus.status === "online",
//         status: userStatus ? userStatus.status : "offline",
//         lastSeen: userStatus ? userStatus.lastSeen : null,
//       });
//     });

//     // Event: Update user status (online, away, busy, etc.)
//     socket.on("update_status", (data) => {
//       const { status } = data; // 'online', 'away', 'busy', 'do_not_disturb'
//       const userId = socket.userId;

//       if (!userId) {
//         socket.emit("error", { message: "User not authenticated" });
//         return;
//       }

//       // Update user status
//       if (onlineUsers.has(userId)) {
//         onlineUsers.get(userId).status = status;
//         onlineUsers.get(userId).lastSeen = new Date();
//       }

//       // Broadcast status change
//       broadcastUserStatus(userId, status);

//       socket.emit("status_updated", {
//         status,
//         timestamp: new Date().toISOString(),
//       });
//     });

//     socket.on("join_chat", async (data) => {
//       const { chatId } = data;
//       const userId = socket.userId;

//       if (!userId) {
//         socket.emit("error", { message: "User not authenticated" });
//         return;
//       }

//       try {
//         const chat = await Chat.findOne({
//           _id: chatId,
//           "participants.userId": userId,
//           "participants.isActive": true,
//         });

//         if (!chat) {
//           socket.emit("error", { message: "Chat not found or access denied" });
//           return;
//         }

//         socket.join(chatId);

//         // Update last seen
//         await chatService.updateLastSeen(chatId, userId);

//         socket.emit("joined_chat", {
//           chatId,
//           message: "Successfully joined chat",
//         });

//         socket.to(chatId).emit("user_online", {
//           userId,
//           chatId,
//           timestamp: new Date().toISOString(),
//         });

//         console.log(`User ${userId} joined chat room: ${chatId}`);
//         console.log(
//           `Emitting user_online event for user ${userId} to chat ${chatId}`
//         );
//       } catch (error) {
//         console.error("Error joining chat:", error);
//         socket.emit("error", { message: "Failed to join chat" });
//       }
//     });

//     socket.on("leave_chat", async (data) => {
//       const { chatId } = data;
//       const userId = socket.userId;

//       if (!userId) {
//         socket.emit("error", { message: "User not authenticated" });
//         return;
//       }

//       try {
//         // Leave the socket room
//         socket.leave(chatId);

//         // Update last seen before leaving
//         await chatService.updateLastSeen(chatId, userId);

//         // Notify other users in the chat that this user is offline
//         socket.to(chatId).emit("user_offline", {
//           userId,
//           chatId,
//           timestamp: new Date().toISOString(),
//         });

//         socket.emit("left_chat", {
//           chatId,
//           message: "Successfully left chat",
//         });

//         console.log(`User ${userId} left chat room: ${chatId}`);
//       } catch (error) {
//         console.error("Error leaving chat:", error);
//         socket.emit("error", { message: "Failed to leave chat" });
//       }
//     });

//     socket.on("send_message", async (data) => {
//       const {
//         chatId,
//         content,
//         messageType = "text",
//         replyTo,
//         fileData,
//         mentions,
//       } = data;
//       const userId = socket.userId;

//       if (!userId) {
//         socket.emit("error", { message: "User not authenticated" });
//         return;
//       }

//       if (!content || !content.trim()) {
//         socket.emit("error", { message: "Message content is required" });
//         return;
//       }

//       try {
//         const additionalData = {};
//         if (replyTo) additionalData.replyTo = replyTo;
//         if (fileData) additionalData.fileData = fileData;
//         if (mentions) additionalData.mentions = mentions;

//         const message = await chatService.createMessage(
//           chatId,
//           userId,
//           content,
//           messageType,
//           additionalData
//         );
//         const populatedMessage = await chatService.getPopulatedMessage(
//           message._id
//         );

//         io.to(chatId).emit("new_message", populatedMessage);

//         // Send push notifications - this is the updated call
//         await sendNotificationToRecipients(
//           chatId,
//           userId,
//           populatedMessage,
//           chatService,
//           onlineUsers
//         );

//         socket.emit("message_delivered", {
//           messageId: message._id,
//           tempId: data.tempId,
//         });

//         console.log(`Message sent to chat ${chatId}:`, content);
//       } catch (error) {
//         console.error("Error sending message:", error);
//         socket.emit("message_error", {
//           error: error.message || "Failed to send message",
//           tempId: data.tempId,
//         });
//       }
//     });

//     socket.on("add_reaction", async (data) => {
//       const { messageId, emoji } = data;
//       const userId = socket.userId;

//       try {
//         const message = await chatService.addReaction(messageId, userId, emoji);
//         const populatedMessage = await chatService.getPopulatedMessage(
//           message._id
//         );

//         io.to(message.chatId).emit("reaction_added", populatedMessage);
//       } catch (error) {
//         console.error("Error adding reaction:", error);
//         socket.emit("error", { message: "Failed to add reaction" });
//       }
//     });

//     socket.on("edit_message", async (data) => {
//       const { messageId, content } = data;
//       const userId = socket.userId;

//       try {
//         const message = await chatService.editMessage(
//           messageId,
//           userId,
//           content
//         );
//         const populatedMessage = await chatService.getPopulatedMessage(
//           message._id
//         );

//         io.to(message.chatId).emit("message_edited", populatedMessage);
//       } catch (error) {
//         console.error("Error editing message:", error);
//         socket.emit("error", { message: "Failed to edit message" });
//       }
//     });

//     socket.on("delete_message", async (data) => {
//       const { messageId } = data;
//       const userId = socket.userId;

//       try {
//         const message = await chatService.deleteMessage(messageId, userId);

//         io.to(message.chatId).emit("message_deleted", { messageId });
//       } catch (error) {
//         console.error("Error deleting message:", error);
//         socket.emit("error", { message: "Failed to delete message" });
//       }
//     });

//     socket.on("typing_start", (data) => {
//       const { chatId } = data;
//       const userId = socket.userId;

//       socket.to(chatId).emit("user_typing", { userId, isTyping: true });
//     });

//     socket.on("typing_stop", (data) => {
//       const { chatId } = data;
//       const userId = socket.userId;

//       socket.to(chatId).emit("user_typing", { userId, isTyping: false });
//     });

//     socket.on("mark_message_read", async (data) => {
//       const { messageId, chatId } = data;
//       const userId = socket.userId;

//       try {
//         await chatService.markMessageAsRead(messageId, userId);
//         socket.to(chatId).emit("message_read", { messageId, userId });
//       } catch (error) {
//         console.error("Error marking message as read:", error);
//       }
//     });

//     socket.on("disconnect", () => {
//       const userId = socket.userId;

//       if (userId) {
//         // Remove from tracking maps
//         userSockets.delete(userId);
//         onlineUsers.delete(userId);

//         // Broadcast that user is offline globally
//         broadcastUserStatus(userId, "offline");

//         // Handle chat-specific offline notifications
//         const rooms = Array.from(socket.rooms).filter(
//           (room) => room !== socket.id
//         );

//         rooms.forEach((chatId) => {
//           socket.to(chatId).emit("user_offline", {
//             userId,
//             chatId,
//             timestamp: new Date().toISOString(),
//           });
//         });

//         console.log(`User ${userId} disconnected from socket ${socket.id}`);
//       }

//       console.log("User disconnected:", socket.id);
//     });
//   });
// };

import Chat from "../models/chat/chat.js";
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

    const recipients = chat.participants.filter((participant) => {
      const participantUserId = participant.userId.toString();
      const senderUserId = senderId.toString();

      return participantUserId !== senderUserId && participant.isActive;
    });

    console.log("📬 Recipients found:", recipients.length);

    for (const recipient of recipients) {
      const recipientId = recipient.userId.toString();
      console.log(`\n🔍 === Processing recipient: ${recipientId} ===`);

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
          icon: "/images/redbiller.png",
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

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("authenticate", async (userData) => {
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

      console.log(`User ${userId} authenticated with socket ${socket.id}`);

      // FIXED: Send last messages using the correct data structure
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

            // Only send if user is NOT in the chat room AND chat has a last message
            if (!isInChatRoom && chat.lastMessageId) {
              try {
                // Get the actual last message from Message collection
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
      }, 500); // Increased delay to ensure socket is ready
    });

    // FIXED: Updated get_last_message event
    socket.on("get_last_message", async (chatId) => {
      const userId = socket.userId;

      if (!userId) {
        socket.emit("error", { message: "User not authenticated" });
        return;
      }

      console.log(
        `🔍 get_last_message requested for chat ${chatId} by user ${userId}`
      );

      // Only fetch if user is NOT in the chat room
      const isInChatRoom = socket.rooms.has(chatId);
      if (isInChatRoom) {
        console.log(
          `User ${userId} is in chat room ${chatId}, skipping last message fetch.`
        );
        return;
      }

      try {
        // Get the chat with user's participation info
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

        // Get the actual last message
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
        console.log(
          `Emitting user_online event for user ${userId} to chat ${chatId}`
        );
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
        // Leave the socket room
        socket.leave(chatId);

        // Update last seen before leaving
        await chatService.updateLastSeen(chatId, userId);

        // Notify other users in the chat that this user is offline
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

        // Send push notifications - this is the updated call
        await sendNotificationToRecipients(
          chatId,
          userId,
          populatedMessage,
          onlineUsers
        );

        // FIXED: Send last_message update to users NOT in the chat room
        try {
          const chat = await Chat.findById(chatId);
          if (chat) {
            // Get all participants except the sender
            const recipients = chat.participants.filter(
              (participant) =>
                participant.userId.toString() !== userId.toString() &&
                participant.isActive
            );

            for (const recipient of recipients) {
              const recipientId = recipient.userId.toString();
              const recipientSocketId = userSockets.get(recipientId);

              if (recipientSocketId) {
                const recipientSocket =
                  io.sockets.sockets.get(recipientSocketId);
                const isInChatRoom = recipientSocket?.rooms?.has(chatId);

                // Only send to users NOT in the chat room
                if (!isInChatRoom) {
                  // Get updated chat data with unread count
                  const userChats = await chatService.getUserChats(recipientId);
                  const chatData = userChats.find(
                    (c) => c._id.toString() === chatId
                  );

                  if (chatData && recipientSocket) {
                    recipientSocket.emit("last_message", {
                      chatId: chatId,
                      message: populatedMessage,
                      unreadCount: chatData.unreadCount || 0,
                      chatType: chatData.chatType,
                      chatName: chatData.metadata?.name || "Unknown Chat",
                      recipientName: chatData.metadata?.recipientName || null,
                    });

                    console.log(
                      `📤 Sent last_message update to user ${recipientId} for chat ${chatId}`
                    );
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error("Error sending last_message updates:", error);
        }

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
