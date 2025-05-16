import { ErrorClass } from "../../utils/errorClass/index.js";
import { TryCatchFunction } from "../../utils/tryCatch/index.js";
import { User } from "../../models/auth/index.js";
import {
  WeeklyReport,
  ActionItem,
  OngoingTask,
  CompletedTask,
} from "../../models/weeklyAction/index.js";

export const createWeeklyReport = TryCatchFunction(async (req, res) => {
  if (
    !req.body ||
    !req.body.ActionItem ||
    !req.body.OngoingTask ||
    !req.body.CompletedTask
  ) {
    throw new ErrorClass(
      "ActionItem, OngoingTask, and CompletedTask are required",
      400
    );
  }

  let actionItems = req.body.ActionItem;
  let ongoingTasks = req.body.OngoingTask;
  let completedTasks = req.body.CompletedTask;

  actionItems = Array.isArray(actionItems) ? actionItems : [actionItems];
  ongoingTasks = Array.isArray(ongoingTasks) ? ongoingTasks : [ongoingTasks];
  completedTasks = Array.isArray(completedTasks)
    ? completedTasks
    : [completedTasks];

  const userId = req.user;
  const userExists = await User.findByPk(userId);
  if (!userExists) {
    throw new ErrorClass("User not found", 404);
  }

  if (
    actionItems.length === 0 &&
    ongoingTasks.length === 0 &&
    completedTasks.length === 0
  ) {
    throw new ErrorClass("At least one task is required", 400);
  }

  const report = await WeeklyReport.create({
    userId,
    submittedAt: new Date(),
  });

  if (actionItems.length > 0) {
    const actionPromises = actionItems.map((item) => {
      return ActionItem.create({
        userId: userId,
        reportId: report.id,
        description: typeof item === "string" ? item : JSON.stringify(item),
      });
    });
    await Promise.all(actionPromises);
  }

  if (ongoingTasks.length > 0) {
    const ongoingPromises = ongoingTasks.map((task) => {
      return OngoingTask.create({
        userId: userId,
        reportId: report.id,
        description: typeof task === "string" ? task : JSON.stringify(task),
      });
    });
    await Promise.all(ongoingPromises);
  }

  if (completedTasks.length > 0) {
    const completedPromises = completedTasks.map((task) => {
      return CompletedTask.create({
        userId: userId,
        reportId: report.id,
        description: typeof task === "string" ? task : JSON.stringify(task),
      });
    });
    await Promise.all(completedPromises);
  }

  res.status(201).json({
    code: 201,
    status: "successful",
    message: "Weekly Report created successfully",
    report: {
      id: report.id,
      userId: report.userId,
      submittedAt: report.submittedAt,
    },
  });
});
