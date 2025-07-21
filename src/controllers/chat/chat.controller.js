import { TryCatchFunction } from "../../utils/tryCatch/index.js";
import { ErrorClass } from "../../utils/errorClass/index.js";
import { ChatService } from "../../service/chat.service.js";
import { User } from "../../models/auth/index.js";

const chatService = new ChatService();

export const createDirectMessage = TryCatchFunction(async (req, res) => {
  const { recipientId } = req.body;
  const userId = req.user;

  if (!recipientId) {
    throw new ErrorClass("Recipient ID is required", 422);
  }
  const chat = await chatService.getOrCreateDirectChat(userId, recipientId);

  return res.status(200).json({
    status: true,
    code: 200,
    message: "Chat created successfully",
    data: { chat },
  });
});

export const createGroupChat = TryCatchFunction(async (req, res) => {
  const { participantIds, metadata } = req.body;
  const userId = req.user;

  if (!participantIds || participantIds.length === 0) {
    throw new ErrorClass("Participant IDs are required", 422);
  }

  const chat = await chatService.createGroupChat(
    userId,
    participantIds,
    metadata
  );

  return res.status(201).json({
    status: true,
    code: 201,
    message: "Group chat created successfully",
    data: { chat },
  });
});

export const getUserChats = TryCatchFunction(async (req, res) => {
  const userId = req.user;
  const chats = await chatService.getUserChats(userId);

  return res.status(200).json({
    status: true,
    code: 200,
    message: "Chats retrieved successfully",
    data: { chats },
  });
});

export const getChatMessages = TryCatchFunction(async (req, res) => {
  const { chatId } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const userId = req.user;

  const messages = await chatService.getChatMessages(
    chatId,
    userId,
    page,
    limit
  );

  return res.status(200).json({
    status: true,
    code: 200,
    message: "Messages retrieved successfully",
    data: { messages },
  });
});

export const sendMessage = TryCatchFunction(async (req, res) => {
  const { chatId } = req.params;
  const {
    content,
    messageType = "text",
    replyTo,
    fileData,
    mentions,
  } = req.body;
  const userId = req.user;

  if (!content) {
    throw new ErrorClass("Message content is required", 422);
  }

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

  // Emit to socket if io is available
  if (req.io) {
    const populatedMessage = await chatService.getPopulatedMessage(message._id);
    req.io.to(chatId).emit("new_message", populatedMessage);
  }

  return res.status(201).json({
    status: true,
    code: 201,
    message: "Message sent successfully",
    data: { message },
  });
});

export const editMessage = TryCatchFunction(async (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;
  const userId = req.user;

  if (!content) {
    throw new ErrorClass("Message content is required", 422);
  }

  const message = await chatService.editMessage(messageId, userId, content);

  // Emit to socket if io is available
  if (req.io) {
    const populatedMessage = await chatService.getPopulatedMessage(message._id);
    req.io.to(message.chatId).emit("message_edited", populatedMessage);
  }

  return res.status(200).json({
    status: true,
    code: 200,
    message: "Message edited successfully",
    data: { message },
  });
});

export const deleteMessage = TryCatchFunction(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user;

  const message = await chatService.deleteMessage(messageId, userId);

  // Emit to socket if io is available
  if (req.io) {
    req.io.to(message.chatId).emit("message_deleted", { messageId });
  }

  return res.status(200).json({
    status: true,
    code: 200,
    message: "Message deleted successfully",
  });
});

export const addReaction = TryCatchFunction(async (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;
  const userId = req.user;

  if (!emoji) {
    throw new ErrorClass("Emoji is required", 422);
  }

  const message = await chatService.addReaction(messageId, userId, emoji);

  // Emit to socket if io is available
  if (req.io) {
    const populatedMessage = await chatService.getPopulatedMessage(message._id);
    req.io.to(message.chatId).emit("reaction_added", populatedMessage);
  }

  return res.status(200).json({
    status: true,
    code: 200,
    message: "Reaction added successfully",
    data: { message },
  });
});

export const removeReaction = TryCatchFunction(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user;

  const message = await chatService.removeReaction(messageId, userId);

  // Emit to socket if io is available
  if (req.io) {
    const populatedMessage = await chatService.getPopulatedMessage(message._id);
    req.io.to(message.chatId).emit("reaction_removed", populatedMessage);
  }

  return res.status(200).json({
    status: true,
    code: 200,
    message: "Reaction removed successfully",
    data: { message },
  });
});

export const addParticipant = TryCatchFunction(async (req, res) => {
  const { chatId } = req.params;
  const { participantId } = req.body;
  const userId = req.user;

  if (!participantId) {
    throw new ErrorClass("Participant ID is required", 422);
  }

  const chat = await chatService.addParticipant(chatId, participantId, userId);

  // Emit to socket if io is available
  if (req.io) {
    req.io
      .to(chatId)
      .emit("participant_added", { chatId, participantId, addedBy: userId });
  }

  return res.status(200).json({
    status: true,
    code: 200,
    message: "Participant added successfully",
    data: { chat },
  });
});

export const removeParticipant = TryCatchFunction(async (req, res) => {
  const { chatId } = req.params;
  const { participantId } = req.body;
  const userId = req.user;

  if (!participantId) {
    throw new ErrorClass("Participant ID is required", 422);
  }

  const chat = await chatService.removeParticipant(
    chatId,
    participantId,
    userId
  );

  // Emit to socket if io is available
  if (req.io) {
    req.io.to(chatId).emit("participant_removed", {
      chatId,
      participantId,
      removedBy: userId,
    });
  }

  return res.status(200).json({
    status: true,
    code: 200,
    message: "Participant removed successfully",
    data: { chat },
  });
});

export const updateNotificationSettings = TryCatchFunction(async (req, res) => {
  const { chatId } = req.params;
  const { notificationSettings } = req.body;
  const userId = req.user;

  if (!notificationSettings) {
    throw new ErrorClass("Notification settings are required", 422);
  }

  await chatService.updateNotificationSettings(
    chatId,
    userId,
    notificationSettings
  );

  return res.status(200).json({
    status: true,
    code: 200,
    message: "Notification settings updated successfully",
  });
});

export const markMessageAsRead = TryCatchFunction(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user;

  const message = await chatService.markMessageAsRead(messageId, userId);

  // Emit to socket if io is available
  if (req.io) {
    req.io.to(message.chatId).emit("message_read", { messageId, userId });
  }

  return res.status(200).json({
    status: true,
    code: 200,
    message: "Message marked as read successfully",
    data: { message },
  });
});

export const getUnreadMessagesCount = TryCatchFunction(async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user;

  const unreadCount = await chatService.getUnreadMessagesCount(chatId, userId);

  return res.status(200).json({
    status: true,
    code: 200,
    message: "Unread messages count retrieved successfully",
    data: { unreadCount },
  });
});

// Add these exports to your existing chat.controller.js file

export const subscribeToPush = async (req, res) => {
  try {
    const { subscription } = req.body;
    console.log(subscription);
    const userId = req.user; // From your authorize middleware

    console.log("💾 Storing push subscription for user:", userId);

    if (!subscription) {
      return res.status(400).json({
        error: "Subscription data is required",
      });
    }

    // Validate subscription format
    if (
      !subscription.endpoint ||
      !subscription.keys ||
      !subscription.keys.p256dh ||
      !subscription.keys.auth
    ) {
      return res.status(400).json({
        error: "Invalid subscription format",
      });
    }

    const user = await User.findByPk(userId);
    console.log(user);
    await user.update(
      { pushSubscription: subscription }, // Fields to update
      { where: { id: userId } } // Condition to find the user by userId
    );

    console.log("✅ Push subscription stored successfully for user:", userId);

    res.status(200).json({
      status: true,
      code: 200,
      message: "Push subscription stored successfully",
    });
  } catch (error) {
    console.error("❌ Error storing push subscription:", error);
    res.status(500).json({
      error: "Failed to store push subscription",
      details: error.message,
    });
  }
};

export const unsubscribeFromPush = async (req, res) => {
  try {
    const userId = req.user.id;

    // Import User model (adjust the import path to match your project structure)
    const { User } = await import("../../models/auth/index.js");

    await User.findByIdAndUpdate(userId, {
      pushSubscription: null,
    });

    console.log("🗑️ Push subscription removed for user:", userId);

    res.status(200).json({
      message: "Push subscription removed successfully",
    });
  } catch (error) {
    console.error("❌ Error removing push subscription:", error);
    res.status(500).json({
      error: "Failed to remove push subscription",
      details: error.message,
    });
  }
};
