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
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);

  const year = d.getUTCFullYear();
  return `${year}-W${String(weekNumber).padStart(2, "0")}`;
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
  let tasks;
  if (user.role === "admin") {
    tasks = await Task.findAll();
  } else {
    tasks = await Task.findAll({
      where: { userId },
    });
  }

  if (!tasks || tasks.length === 0) {
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

export const deleteTask = TryCatchFunction(async (req, res) => {
  const { id } = req.params;
  if (!id) {
    throw new ErrorClass("Task ID is required", 400);
  }
  const userId = req.user;
  if (!userId) {
    throw new ErrorClass("User ID is required", 400);
  }
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
  await task.destroy();
  return res.status(200).json({
    code: 200,
    status: true,
    message: "Task deleted successfully",
  });
});
