// service/chat.service.js
import Chat from "../models/chat/chat.js";
import Message from "../models/chat/message.js";
import { User } from "../models/auth/index.js";
import { ErrorClass } from "../utils/errorClass/index.js";

export class ChatService {
  async getOrCreateDirectChat(userId, recipientId) {
    // Check if chat exists
    let chat = await Chat.findOne({
      chatType: "individual",
      "participants.userId": { $all: [userId, recipientId] },
      status: "active",
    });

    if (chat) {
      // Update last seen for the requesting user
      await this.updateLastSeen(chat._id, userId);
      return chat;
    }

    // Verify both users exist
    const [user, recipient] = await Promise.all([
      User.findByPk(userId),
      User.findByPk(recipientId),
    ]);

    if (!user || !recipient) {
      throw new ErrorClass("User not found", 404);
    }

    // Create chat name based on participants
    const chatName = `${user.firstName} & ${recipient.firstName}`;

    // Create new chat
    chat = new Chat({
      chatType: "individual",
      metadata: {
        name: chatName,
        isPublic: false,
        createdBy: userId,
      },
      participants: [
        {
          userId,
          role: "member",
          isActive: true,
          unreadCount: 0,
          lastSeen: new Date(),
          notificationSettings: { muted: false },
        },
        {
          userId: recipientId,
          role: "member",
          isActive: true,
          unreadCount: 0,
          lastSeen: new Date(),
          notificationSettings: { muted: false },
        },
      ],
      settings: {
        approvalRequired: false,
        onlyAdminsCanSend: false,
      },
    });

    await chat.save();
    return chat;
  }

  async createGroupChat(creatorId, participantIds, metadata) {
    // Verify creator exists
    const creator = await User.findByPk(creatorId);
    if (!creator) {
      throw new ErrorClass("Creator not found", 404);
    }

    // FIXED: Use Sequelize syntax for User model
    const participants = await User.findAll({
      where: { id: participantIds },
    });

    if (participants.length !== participantIds.length) {
      throw new ErrorClass("Some participants not found", 404);
    }

    // Create participants array
    const chatParticipants = [
      {
        userId: creatorId,
        role: "owner",
        isActive: true,
        unreadCount: 0,
        lastSeen: new Date(),
        notificationSettings: { muted: false },
      },
      ...participantIds
        .filter((id) => id !== creatorId)
        .map((userId) => ({
          userId,
          role: "member",
          isActive: true,
          unreadCount: 0,
          lastSeen: new Date(),
          notificationSettings: { muted: false },
        })),
    ];

    const chat = new Chat({
      chatType: "group",
      metadata: {
        name: metadata.name || "New Group",
        avatar: metadata.avatar || "",
        createdBy: creatorId,
        isPublic: metadata.isPublic || false,
      },
      participants: chatParticipants,
      settings: {
        approvalRequired: metadata.approvalRequired || false,
        onlyAdminsCanSend: metadata.onlyAdminsCanSend || false,
      },
    });

    await chat.save();
    return chat;
  }

  // async getUserChats(userId) {
  //   const chats = await Chat.find({
  //     "participants.userId": userId,
  //     "participants.isActive": true,
  //     status: "active",
  //     lastMessageId: { $exists: true },
  //   }).sort({ updatedAt: -1 });

  //   // Transform chats with additional user info
  //   return Promise.all(
  //     chats.map(async (chat) => {
  //       const participant = chat.participants.find(
  //         (p) => p.userId.toString() === userId
  //       );
  //       const unreadCount = await this.getUnreadMessagesCount(chat._id, userId);
  //       const currentUser = await User.findByPk(userId, {
  //         attributes: ["id", "firstName", "lastName"],
  //       });

  //       // FIXED: Handle group chats properly
  //       let recipientData = null;
  //       if (chat.chatType === "individual") {
  //         const recipientParticipant = chat.participants.find(
  //           (p) => p.userId.toString() !== userId.toString()
  //         );
  //         const recipientId = recipientParticipant?.userId;

  //         if (recipientId) {
  //           recipientData = await User.findByPk(recipientId, {
  //             attributes: ["id", "firstName", "lastName"],
  //           });
  //         }
  //       }

  //       const chatObj = chat.toObject();

  //       if (chat.chatType === "individual" && recipientData) {
  //         chatObj.metadata = {
  //           ...chatObj.metadata,
  //           senderId: currentUser.id,
  //           senderName: `${currentUser.firstName} ${currentUser.lastName}`,
  //           recipientId: recipientData.id,
  //           recipientName: `${recipientData.firstName} ${recipientData.lastName}`,
  //         };
  //       } else {
  //         // For group chats, just add sender info
  //         chatObj.metadata = {
  //           ...chatObj.metadata,
  //           senderId: currentUser.id,
  //           senderName: `${currentUser.firstName} ${currentUser.lastName}`,
  //         };
  //       }

  //       chatObj.unreadCount = unreadCount;
  //       chatObj.lastSeen = participant?.lastSeen;
  //       console.log(chatObj);
  //       return chatObj;
  //     })
  //   );
  // }

  async getUserChats(userId) {
    const chats = await Chat.find({
      "participants.userId": userId,
      "participants.isActive": true,
      status: "active",
    }).sort({ updatedAt: -1 });

    // Transform chats with additional user info
    return Promise.all(
      chats.map(async (chat) => {
        const participant = chat.participants.find(
          (p) => p.userId.toString() === userId
        );
        const unreadCount = await this.getUnreadMessagesCount(chat._id, userId);
        const currentUser = await User.findByPk(userId, {
          attributes: ["id", "firstName", "lastName"],
        });

        // Fetch the last message
        let lastMessage = null;
        if (chat.lastMessageId) {
          lastMessage = await Message.findById(chat.lastMessageId);
        }

        // Handle group chats properly
        let recipientData = null;
        if (chat.chatType === "individual") {
          const recipientParticipant = chat.participants.find(
            (p) => p.userId.toString() !== userId.toString()
          );
          const recipientId = recipientParticipant?.userId;

          if (recipientId) {
            recipientData = await User.findByPk(recipientId, {
              attributes: ["id", "firstName", "lastName"],
            });
          }
        }

        const chatObj = chat.toObject();

        if (chat.chatType === "individual" && recipientData) {
          chatObj.metadata = {
            ...chatObj.metadata,
            senderId: currentUser.id,
            senderName: `${currentUser.firstName} ${currentUser.lastName}`,
            recipientId: recipientData.id,
            recipientName: `${recipientData.firstName} ${recipientData.lastName}`,
          };
        } else {
          // For group chats, just add sender info
          chatObj.metadata = {
            ...chatObj.metadata,
            senderId: currentUser.id,
            senderName: `${currentUser.firstName} ${currentUser.lastName}`,
          };
        }

        chatObj.unreadCount = unreadCount;
        chatObj.lastSeen = participant?.lastSeen;

        return {
          ...chatObj,
          lastMessage: lastMessage,
        };
      })
    );
  }

  async getChatMessages(chatId, userId, page = 1, limit = 50) {
    // Verify user is participant
    const chat = await Chat.findOne({
      _id: chatId,
      "participants.userId": userId,
      "participants.isActive": true,
    });

    if (!chat) throw new ErrorClass("Chat not found or access denied", 404);

    const messages = await Message.find({
      chatId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Update last seen and reset unread count
    await this.updateLastSeen(chatId, userId);
    await this.resetUnreadCount(chatId, userId);

    return messages.reverse(); // Return in chronological order
  }

  async createMessage(
    chatId,
    senderId,
    content,
    messageType = "text",
    additionalData = {}
  ) {
    console.log(
      "📝 Creating message in chat:",
      chatId,
      "from sender:",
      senderId
    );

    // Verify user is participant of the chat
    const chat = await Chat.findOne({
      _id: chatId,
      "participants.userId": senderId,
      "participants.isActive": true,
    });

    if (!chat) throw new ErrorClass("Chat not found or access denied", 404);

    // Check if only admins can send (for group chats)
    if (chat.settings.onlyAdminsCanSend && chat.chatType === "group") {
      const participant = chat.participants.find(
        (p) => p.userId.toString() === senderId
      );
      if (!participant || !["admin", "owner"].includes(participant.role)) {
        throw new ErrorClass("Only admins can send messages in this chat", 403);
      }
    }

    const messageData = {
      chatId,
      senderId,
      content,
      messageType,
      ...additionalData, // Include replyTo, fileData, mentions, etc.
    };

    const message = new Message(messageData);
    await message.save();
    console.log("💾 Message saved with ID:", message._id);

    // FIXED: Use proper MongoDB syntax for Chat model
    // await Chat.findByIdAndUpdate(chatId, {
    //   lastMessageId: message._id,
    //   updatedAt: new Date(),
    // });

    await Chat.findByIdAndUpdate(
      chatId,
      {
        lastMessageId: message._id,
        updatedAt: new Date(),
      },
      { new: true } // Optional: returns the updated document
    );

    // Increment unread count for all participants except sender
    const updateResult = await Chat.updateOne(
      { _id: chatId },
      {
        $inc: {
          "participants.$[elem].unreadCount": 1,
        },
      },
      {
        arrayFilters: [{ "elem.userId": { $ne: senderId } }],
      }
    );

    console.log("📊 Unread count update result:", updateResult);

    return message;
  }

  async hasUnseenMessages(chatId, userId) {
    try {
      console.log(
        `🔍 Checking unseen messages for user ${userId} in chat ${chatId}`
      );

      // Get user's unread count from the chat participants
      const chat = await Chat.findOne(
        {
          _id: chatId,
          "participants.userId": userId,
        },
        {
          "participants.$": 1,
        }
      );

      if (!chat || !chat.participants.length) {
        console.log(`❌ Chat or participant not found`);
        return false;
      }

      const participant = chat.participants[0];
      console.log(`👤 Participant data:`, {
        userId: participant.userId,
        unreadCount: participant.unreadCount,
        muted: participant.notificationSettings?.muted,
      });

      // Check if user has muted notifications
      if (participant.notificationSettings?.muted) {
        console.log(`🔇 User has muted notifications`);
        return false;
      }

      // Return true if unread count is greater than 0
      const hasUnseen = participant.unreadCount > 0;
      console.log(`📬 Has unseen messages: ${hasUnseen}`);
      return hasUnseen;
    } catch (error) {
      console.error("Error checking unseen messages:", error);
      return false;
    }
  }

  async getPopulatedMessage(messageId) {
    const message = await Message.findById(messageId);
    console.log("📨 Retrieved message:", message?._id);
    return message;
  }

  async markMessageAsRead(messageId, userId) {
    const message = await Message.findById(messageId);
    if (!message) throw new ErrorClass("Message not found", 404);

    // Check if user is already in readBy array
    const alreadyRead = message.readBy.some(
      (read) => read.userId.toString() === userId
    );

    if (!alreadyRead) {
      message.readBy.push({ userId, readAt: new Date() });
      await message.save();
    }
    return message;
  }

  async getUnreadMessagesCount(chatId, userId) {
    const participant = await Chat.findOne(
      { _id: chatId, "participants.userId": userId },
      { "participants.$": 1 }
    );

    if (!participant) return 0;

    const lastSeen = participant.participants[0].lastSeen;

    return await Message.countDocuments({
      chatId,
      senderId: { $ne: userId },
      createdAt: { $gt: lastSeen },
      isDeleted: false,
    });
  }

  async updateLastSeen(chatId, userId) {
    const result = await Chat.updateOne(
      { _id: chatId, "participants.userId": userId },
      {
        $set: {
          "participants.$.lastSeen": new Date(),
        },
      }
    );
    console.log(
      `⏰ Updated last seen for user ${userId} in chat ${chatId}:`,
      result
    );
  }

  async resetUnreadCount(chatId, userId) {
    const result = await Chat.updateOne(
      { _id: chatId, "participants.userId": userId },
      {
        $set: {
          "participants.$.unreadCount": 0,
        },
      }
    );
    console.log(
      `🔄 Reset unread count for user ${userId} in chat ${chatId}:`,
      result
    );
  }

  async addReaction(messageId, userId, emoji) {
    const message = await Message.findById(messageId);
    if (!message) throw new ErrorClass("Message not found", 404);

    // Remove existing reaction from this user
    message.reactions = message.reactions.filter(
      (reaction) => reaction.userId.toString() !== userId
    );

    // Add new reaction
    message.reactions.push({
      userId,
      emoji,
      reactedAt: new Date(),
    });

    await message.save();
    return message;
  }

  async removeReaction(messageId, userId) {
    const message = await Message.findById(messageId);
    if (!message) throw new ErrorClass("Message not found", 404);

    message.reactions = message.reactions.filter(
      (reaction) => reaction.userId.toString() !== userId
    );

    await message.save();
    return message;
  }

  async editMessage(messageId, userId, newContent) {
    const message = await Message.findOne({
      _id: messageId,
      senderId: userId,
      isDeleted: false,
    });

    if (!message)
      throw new ErrorClass("Message not found or access denied", 404);

    message.content = newContent;
    message.isEdited = true;
    await message.save();

    return message;
  }

  async deleteMessage(messageId, userId) {
    const message = await Message.findOne({
      _id: messageId,
      senderId: userId,
    });

    if (!message)
      throw new ErrorClass("Message not found or access denied", 404);

    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();

    return message;
  }

  async addParticipant(chatId, newParticipantId, addedBy) {
    const chat = await Chat.findById(chatId);
    if (!chat) throw new ErrorClass("Chat not found", 404);

    // Check if user has permission to add participants
    const adder = chat.participants.find(
      (p) => p.userId.toString() === addedBy
    );
    if (!adder || !["admin", "owner"].includes(adder.role)) {
      throw new ErrorClass("Only admins can add participants", 403);
    }

    // Check if participant already exists
    const existingParticipant = chat.participants.find(
      (p) => p.userId.toString() === newParticipantId
    );

    if (existingParticipant) {
      if (existingParticipant.isActive) {
        throw new ErrorClass("User is already a participant", 400);
      } else {
        // Reactivate existing participant
        existingParticipant.isActive = true;
        existingParticipant.unreadCount = 0;
        existingParticipant.lastSeen = new Date();
      }
    } else {
      // Add new participant
      chat.participants.push({
        userId: newParticipantId,
        role: "member",
        isActive: true,
        unreadCount: 0,
        lastSeen: new Date(),
        notificationSettings: { muted: false },
      });
    }

    await chat.save();
    return chat;
  }

  async removeParticipant(chatId, participantId, removedBy) {
    const chat = await Chat.findById(chatId);
    if (!chat) throw new ErrorClass("Chat not found", 404);

    // Check if user has permission to remove participants
    const remover = chat.participants.find(
      (p) => p.userId.toString() === removedBy
    );
    if (!remover || !["admin", "owner"].includes(remover.role)) {
      throw new ErrorClass("Only admins can remove participants", 403);
    }

    // Find and deactivate participant
    const participant = chat.participants.find(
      (p) => p.userId.toString() === participantId
    );
    if (!participant) {
      throw new ErrorClass("Participant not found", 404);
    }

    participant.isActive = false;
    await chat.save();

    return chat;
  }

  async updateNotificationSettings(chatId, userId, settings) {
    const result = await Chat.updateOne(
      { _id: chatId, "participants.userId": userId },
      {
        $set: {
          "participants.$.notificationSettings": settings,
        },
      }
    );
    console.log(
      `🔔 Updated notification settings for user ${userId} in chat ${chatId}:`,
      result
    );
    return result;
  }

  // NEW: Method to get notification preferences for debugging
  async getNotificationSettings(chatId, userId) {
    const chat = await Chat.findOne(
      { _id: chatId, "participants.userId": userId },
      { "participants.$": 1 }
    );

    if (!chat || !chat.participants.length) return null;

    return chat.participants[0].notificationSettings;
  }

  // NEW: Method to manually trigger unread count check
  async checkAndFixUnreadCounts(chatId) {
    console.log(`🔧 Checking unread counts for chat: ${chatId}`);

    const chat = await Chat.findById(chatId);
    if (!chat) return;

    for (const participant of chat.participants) {
      if (!participant.isActive) continue;

      const actualUnreadCount = await this.getUnreadMessagesCount(
        chatId,
        participant.userId
      );

      if (participant.unreadCount !== actualUnreadCount) {
        console.log(
          `🔄 Fixing unread count for user ${participant.userId}: ${participant.unreadCount} -> ${actualUnreadCount}`
        );

        await Chat.updateOne(
          { _id: chatId, "participants.userId": participant.userId },
          {
            $set: {
              "participants.$.unreadCount": actualUnreadCount,
            },
          }
        );
      }
    }
  }
}
