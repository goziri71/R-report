// import mongoose from "mongoose";

// const chatSchema = new mongoose.Schema({
//   chatType: {
//     type: String,
//     enum: ["individual", "general", "group"],
//     required: true,
//   },

//   status: {
//     type: String,
//     enum: ["active", "archived", "deleted"],
//     default: "active",
//     required: true,
//   },

//   metadata: {
//     name: {
//       type: String,
//       required: true,
//     },

//     avatar: {
//       type: String,
//     },

//     createdBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     isPublic: {
//       type: Boolean,
//       default: false,
//     },
//   },

//   participants: [
//     {
//       userId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "User",
//         required: true,
//       },

//       role: {
//         type: String,
//         enum: ["member", "admin", "owner"],
//         default: "member",
//         required: true,
//       },

//       isActive: {
//         type: Boolean,
//         default: true,
//       },

//       unreadCount: {
//         type: Number,
//         default: 0,
//       },

//       lastSeen: {
//         type: Date,
//         default: Date.now,
//       },

//       notificationSettings: {
//         muted: {
//           type: Boolean,
//           default: false,
//         },
//       },
//     },
//   ],

//   settings: {
//     approvalRequired: {
//       type: Boolean,
//       default: false,
//     },

//     onlyAdminsCanSend: {
//       type: Boolean,
//       default: false,
//     },
//   },

//   lastMessageId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Message",
//   },

//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },

//   updatedAt: {
//     type: Date,
//     default: Date.now,
//   },
// });

// // Add indexes
// chatSchema.index({ "participants.userId": 1 });
// chatSchema.index({ chatType: 1, status: 1 });
// chatSchema.index({ updatedAt: -1 });

// const Chat = mongoose.model("Chat", chatSchema);

// export default Chat;

import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
  chatType: {
    type: String,
    enum: ["individual", "general", "group"],
    required: true,
  },

  status: {
    type: String,
    enum: ["active", "archived", "deleted"],
    default: "active",
    required: true,
  },

  metadata: {
    name: {
      type: String,
      required: true,
    },

    avatar: {
      type: String,
    },

    createdBy: {
      type: Number,
      ref: "User",
      required: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
  },

  participants: [
    {
      userId: {
        type: Number,
        required: true,
      },

      role: {
        type: String,
        enum: ["member", "admin", "owner"],
        default: "member",
        required: true,
      },

      isActive: {
        type: Boolean,
        default: true,
      },

      unreadCount: {
        type: Number,
        default: 0,
      },

      lastSeen: {
        type: Date,
        default: Date.now,
      },

      notificationSettings: {
        muted: {
          type: Boolean,
          default: false,
        },
      },
    },
  ],

  settings: {
    approvalRequired: {
      type: Boolean,
      default: false,
    },

    onlyAdminsCanSend: {
      type: Boolean,
      default: false,
    },
  },

  lastMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

chatSchema.index({ "participants.userId": 1 });
chatSchema.index({ chatType: 1, status: 1 });
chatSchema.index({ updatedAt: -1 });

const Chat = mongoose.model("Chat", chatSchema);

export default Chat;
