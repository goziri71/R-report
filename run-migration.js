import db from "./src/database/database.js";
import { DataTypes } from "sequelize";

// Migration: add weekKey to tasks, backfill, set NOT NULL, add indexes
const addWeekKeyToTasks = async () => {
  try {
    const qi = db.getQueryInterface();

    const table = "tasks"; // Sequelize pluralizes 'task' by default
    const desc = await qi.describeTable(table);

    if (!desc.weekKey) {
      console.log("🔧 Adding weekKey column to tasks...");
      await qi.addColumn(table, "weekKey", {
        type: DataTypes.STRING(10),
        allowNull: true,
      });

      // Backfill from createdAt using Postgres ISO week format
      await db.query(`UPDATE "tasks"
        SET "weekKey" = to_char(COALESCE("createdAt", now()) AT TIME ZONE 'UTC', 'IYYY-"W"IW')
        WHERE "weekKey" IS NULL`);

      console.log("🔒 Enforcing NOT NULL on weekKey...");
      await qi.changeColumn(table, "weekKey", {
        type: DataTypes.STRING(10),
        allowNull: false,
      });

      console.log("📚 Creating indexes on weekKey...");
      await qi.addIndex(table, ["weekKey"], { name: "tasks_weekKey_idx" });
      await qi.addIndex(table, ["userId", "weekKey"], {
        name: "tasks_userId_weekKey_idx",
      });
    } else {
      console.log("✅ weekKey already exists on tasks");
    }

    console.log("✅ Migration completed");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await db.close();
  }
};

addWeekKeyToTasks();
