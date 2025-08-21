import { TryCatchFunction } from "../../utils/tryCatch/index.js";
import { ErrorClass } from "../../utils/errorClass/index.js";
import { Task } from "../../models/task/index.js";
import { User } from "../../models/auth/index.js";

// Helper: ISO week key like "2025-W34"
const getCurrentWeekKey = () => {
  const date = new Date();
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // shift to Thursday
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const diff = (d - firstThursday) / 86400000;
  const week = 1 + Math.round((diff - 3) / 7);
  const year = d.getUTCFullYear();
  return `${year}-W${String(week).padStart(2, "0")}`;
};

export const createTask = TryCatchFunction(async (req, res) => {
  const { title, description, priority, status } = req.body;
  const userId = req.user;
  const user = await User.findByPk(userId);
  if (!user) {
    throw new ErrorClass("User not found", 404);
  }
  if (!title || !description || !priority || !status) {
    throw new ErrorClass("All fields are required", 400);
  }
  if (priority !== "low" && priority !== "medium" && priority !== "high") {
    throw new ErrorClass("Invalid priority", 400);
  }
  if (
    status !== "to_do" &&
    status !== "in_progress" &&
    status !== "completed" &&
    status !== "confirmed"
  ) {
    throw new ErrorClass("Invalid status", 400);
  }
  const weekKey = getCurrentWeekKey();
  const task = await Task.create({
    userId,
    title,
    description,
    priority,
    status,
    weekKey,
  });
  return res.status(201).json({
    code: 201,
    status: true,
    message: "Task created successfully",
    data: task,
  });
});

export const getTasks = TryCatchFunction(async (req, res) => {
  const userId = req.user;
  const user = await User.findByPk(userId);
  if (!user) {
    throw new ErrorClass("User not found", 404);
  }
  const tasks = await Task.findAll({ where: { userId } });
  if (!tasks) {
    throw new ErrorClass("No tasks found", 404);
  }
  return res.status(200).json({
    code: 200,
    status: true,
    message: "Tasks retrieved successfully",
    data: tasks,
  });
});

export const editeTask = TryCatchFunction(async (req, res) => {
  const { id } = req.params;
  const { title, description, priority, status } = req.body;
  const userId = req.user;
  const user = await User.findByPk(userId);
  if (!user) {
    throw new ErrorClass("User not found", 404);
  }
  const task = await Task.findByPk(id);
  if (!task) {
    throw new ErrorClass("Task not found", 404);
  }
  if (task.userId !== userId) {
    throw new ErrorClass("Unauthorized", 403);
  }
  //   // Validate provided fields
  //   if (!title && !description && !priority && !status) {
  //     throw new ErrorClass("At least one field is required to update", 400);
  //   }

  //   if (priority) {
  //     const allowedPriorities = ["low", "medium", "high"];
  //     if (!allowedPriorities.includes(priority)) {
  //       throw new ErrorClass("Invalid priority", 400);
  //     }
  //   }

  //   if (status) {
  //     const allowedStatuses = ["to_do", "in_progress", "completed", "confirmed"];
  //     if (!allowedStatuses.includes(status)) {
  //       throw new ErrorClass("Invalid status", 400);
  //     }
  //   }

  // Build update payload with only provided fields
  const updatePayload = {};
  if (title !== undefined) updatePayload.title = title;
  if (description !== undefined) updatePayload.description = description;
  if (priority !== undefined) updatePayload.priority = priority;
  if (status !== undefined) updatePayload.status = status;

  await task.update(updatePayload);

  return res.status(200).json({
    code: 200,
    status: true,
    message: "Task updated successfully",
    data: task,
  });
});
