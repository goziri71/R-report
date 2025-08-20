import { User } from "./auth/index.js";
import { Task } from "./task/index.js";
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
    foreignKey: "reportId",
    onDelete: "CASCADE",
  });

  WeeklyReport.hasMany(OngoingTask, {
    foreignKey: "reportId",
    onDelete: "CASCADE",
  });

  WeeklyReport.hasMany(CompletedTask, {
    foreignKey: "reportId",
    onDelete: "CASCADE",
  });

  ActionItem.belongsTo(WeeklyReport, { foreignKey: "reportId" });
  OngoingTask.belongsTo(WeeklyReport, { foreignKey: "reportId" });
  CompletedTask.belongsTo(WeeklyReport, { foreignKey: "reportId" });

  User.hasMany(ActionItem, { foreignKey: "userId" });
  User.hasMany(OngoingTask, { foreignKey: "userId" });
  User.hasMany(CompletedTask, { foreignKey: "userId" });

  // Tasks associations (Kanban)
  User.hasMany(Task, { foreignKey: "userId", as: "createdTasks" });
  Task.belongsTo(User, { foreignKey: "userId", as: "creator" });
  User.hasMany(Task, { foreignKey: "assigneeId", as: "assignedTasks" });
  Task.belongsTo(User, { foreignKey: "assigneeId", as: "assignee" });
};

export default setupAssociations;
