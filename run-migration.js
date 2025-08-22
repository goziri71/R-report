import db from "./src/database/database.js"; // Adjust path to your database file
import { DataTypes } from "sequelize";

const addPushSubscriptionColumn = async () => {
  try {
    const queryInterface = db.getQueryInterface();

    // Check if column already exists
    const tableDescription = await queryInterface.describeTable("Users");

    if (tableDescription.pushSubscription) {
      console.log("✅ Column pushSubscription already exists");
      return;
    }

    // Add the column
    await queryInterface.addColumn("Users", "pushSubscription", {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
    });

    console.log("✅ pushSubscription column added successfully");
  } catch (error) {
    console.error("❌ Error adding column:", error);
  } finally {
    await db.close();
  }
};

addPushSubscriptionColumn();
