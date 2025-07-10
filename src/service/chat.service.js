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
    //   .populate("participants.userId", "name avatar email")
    //   .populate("lastMessageId");

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
        createdBy: userId,
        isPublic: false,
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
    // await chat.populate("participants.userId", "name avatar email");

    return chat;
  }

  async createGroupChat(creatorId, participantIds, metadata) {
    // Verify creator exists
    const creator = await User.findByPk(creatorId);
    if (!creator) {
      throw new ErrorClass("Creator not found", 404);
    }

    // Verify all participants exist
    const participants = await User.find({ _id: { $in: participantIds } });
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
    // await chat.populate("participants.userId", "name avatar email");

    return chat;
  }

  async getUserChats(userId) {
    const chats = await Chat.find({
      "participants.userId": userId,
      "participants.isActive": true,
      status: "active",
    })
      //   .populate("lastMessageId")
      //   .populate("participants.userId", "name avatar email")
      .sort({ updatedAt: -1 });

    // Add unread count for each chat
    return Promise.all(
      chats.map(async (chat) => {
        const participant = chat.participants.find(
          (p) => p.userId.toString() === userId
        );
        const unreadCount = await this.getUnreadMessagesCount(chat._id, userId);

        return {
          ...chat.toObject(),
          unreadCount: unreadCount,
          lastSeen: participant?.lastSeen,
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
      //   .populate("senderId", "name avatar email")
      //   .populate("replyTo")
      //   .populate("mentions.userId", "name")
      //   .populate("reactions.userId", "name")
      //   .populate("readBy.userId", "name")
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

    // Update chat's last message and timestamp
    await Chat.findByIdAndUpdate(chatId, {
      lastMessageId: message._id,
      updatedAt: new Date(),
    });

    // Increment unread count for all participants except sender
    await Chat.updateOne(
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

    return message;
  }

  async getPopulatedMessage(messageId) {
    return await Message.findById(messageId);
    //   .populate("senderId", "name avatar email")
    //   .populate("replyTo")
    //   .populate("mentions.userId", "name")
    //   .populate("reactions.userId", "name")
    //   .populate("readBy.userId", "name");
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
    await Chat.updateOne(
      { _id: chatId, "participants.userId": userId },
      {
        $set: {
          "participants.$.lastSeen": new Date(),
        },
      }
    );
  }

  async resetUnreadCount(chatId, userId) {
    await Chat.updateOne(
      { _id: chatId, "participants.userId": userId },
      {
        $set: {
          "participants.$.unreadCount": 0,
        },
      }
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
    await Chat.updateOne(
      { _id: chatId, "participants.userId": userId },
      {
        $set: {
          "participants.$.notificationSettings": settings,
        },
      }
    );
  }
}
