import { User } from "./auth/index.js";
import { events } from "./events/index.js";
import { Incident } from "./incedent/index.js";
import {
  WeeklyReport,
  ActionItem,
  OngoingTask,
  CompletedTask,
} from "./weeklyAction/index.js";

const setupAssociations = () => {
  User.hasMany(Incident, { foreignKey: "userId" });
  Incident.belongsTo(User, { foreignKey: "userId" });

  User.hasMany(events, { foreignKey: "userId" });
  events.belongsTo(User, { foreignKey: "userId" });

  User.hasMany(WeeklyReport, { foreignKey: "userId" });
  WeeklyReport.belongsTo(User, { foreignKey: "userId" });

  WeeklyReport.hasMany(ActionItem, {
    foreignKey: "userId",
    onDelete: "CASCADE",
  });

  WeeklyReport.hasMany(OngoingTask, {
    foreignKey: "userId",
    onDelete: "CASCADE",
  });

  WeeklyReport.hasMany(CompletedTask, {
    foreignKey: "userId",
    onDelete: "CASCADE",
  });

  ActionItem.belongsTo(WeeklyReport, { foreignKey: "userId" });
  OngoingTask.belongsTo(WeeklyReport, { foreignKey: "userId" });
  CompletedTask.belongsTo(WeeklyReport, { foreignKey: "userId" });
};

export default setupAssociations;
