import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Chat",
    required: true,
  },

  senderId: {
    type: Number,
    ref: "User",
    required: true,
  },

  content: { type: String, required: true },

  messageType: {
    type: String,
    enum: ["text", "image", "file", "system", "voice"],
    required: true,
  },

  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message",
  },

  fileData: {
    filename: String,
    size: Number,
    mimeType: String,
    url: String,
  },

  mentions: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      position: { type: Number, required: true },
    },
  ],

  reactions: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      emoji: {
        type: String,
        required: true,
      },

      reactedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],

  readBy: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      readAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],

  isEdited: {
    type: Boolean,
    default: false,
  },

  isDeleted: {
    type: Boolean,
    default: false,
  },

  deletedAt: {
    type: Date,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Critical indexes for performance
messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ "mentions.userId": 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
