// Migration script to update message schema for new media types
// Run this script to ensure backward compatibility

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI environment variable is not defined");
  process.exit(1);
}

async function migrateMessageSchema() {
  try {
    console.log("🚀 Starting message schema migration...");

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Get the messages collection
    const db = mongoose.connection.db;
    const messagesCollection = db.collection("messages");

    // Check if there are any messages with old "image" type that should be "photo"
    const imageMessages = await messagesCollection
      .find({ messageType: "image" })
      .toArray();

    if (imageMessages.length > 0) {
      console.log(
        `📷 Found ${imageMessages.length} messages with old "image" type`
      );

      // Update "image" type to "photo" for consistency
      const updateResult = await messagesCollection.updateMany(
        { messageType: "image" },
        { $set: { messageType: "photo" } }
      );

      console.log(
        `✅ Updated ${updateResult.modifiedCount} messages from "image" to "photo"`
      );
    }

    // Check for messages with incomplete fileData
    const messagesWithFileData = await messagesCollection
      .find({
        fileData: { $exists: true },
        $or: [
          { "fileData.originalName": { $exists: false } },
          { "fileData.duration": { $exists: false } },
          { "fileData.timestamp": { $exists: false } },
        ],
      })
      .toArray();

    if (messagesWithFileData.length > 0) {
      console.log(
        `📁 Found ${messagesWithFileData.length} messages with incomplete fileData`
      );

      // Update messages to add missing fileData fields
      for (const message of messagesWithFileData) {
        const updateData = {};

        if (!message.fileData.originalName && message.fileData.filename) {
          // Extract original name from filename if possible
          const filenameParts = message.fileData.filename.split("_");
          if (filenameParts.length > 1) {
            updateData["fileData.originalName"] = filenameParts
              .slice(1)
              .join("_");
          } else {
            updateData["fileData.originalName"] = message.fileData.filename;
          }
        }

        if (!message.fileData.duration) {
          updateData["fileData.duration"] = 0;
        }

        if (!message.fileData.timestamp) {
          updateData["fileData.timestamp"] = message.createdAt
            ? new Date(message.createdAt).getTime()
            : Date.now();
        }

        if (Object.keys(updateData).length > 0) {
          await messagesCollection.updateOne(
            { _id: message._id },
            { $set: updateData }
          );
        }
      }

      console.log("✅ Updated fileData fields for existing messages");
    }

    // Create index for messageType if it doesn't exist
    try {
      await messagesCollection.createIndex({ messageType: 1 });
      console.log("✅ Created index for messageType field");
    } catch (error) {
      if (error.code === 85) {
        // Index already exists
        console.log("ℹ️  messageType index already exists");
      } else {
        throw error;
      }
    }

    // Verify the migration
    const photoMessages = await messagesCollection
      .find({ messageType: "photo" })
      .count();
    const videoMessages = await messagesCollection
      .find({ messageType: "video" })
      .count();
    const fileMessages = await messagesCollection
      .find({ messageType: "file" })
      .count();
    const voiceMessages = await messagesCollection
      .find({ messageType: "voice" })
      .count();

    console.log("\n📊 Migration Summary:");
    console.log(`- Photo messages: ${photoMessages}`);
    console.log(`- Video messages: ${videoMessages}`);
    console.log(`- File messages: ${fileMessages}`);
    console.log(`- Voice messages: ${voiceMessages}`);

    console.log("\n✅ Message schema migration completed successfully!");
    console.log("\n🔧 Schema now supports:");
    console.log(
      "- messageType: text, image, file, system, voice, photo, video"
    );
    console.log(
      "- fileData: filename, originalName, size, mimeType, url, duration, timestamp"
    );
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run migration
migrateMessageSchema();
