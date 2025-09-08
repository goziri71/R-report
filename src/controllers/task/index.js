import { TryCatchFunction } from "../../utils/tryCatch/index.js";
import { ErrorClass } from "../../utils/errorClass/index.js";
import { Task } from "../../models/task/index.js";
import { User } from "../../models/auth/index.js";
import axios from "axios";
import {
  WeeklyReport,
  ActionItem,
  OngoingTask,
  CompletedTask,
} from "../../models/weeklyAction/index.js";

// Helper: ISO week key like "2025-W34"
const getCurrentWeekKey = () => {
  const date = new Date();
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayOfWeek = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  const year = d.getUTCFullYear();
  return `${year}-W${String(weekNumber).padStart(2, "0")}`;
};

// Send email notifications to admins when a task is confirmed
const sendTaskConfirmedEmails = async (task, actingUser) => {
  try {
    const department = task.occupation || actingUser.occupation;
    console.log(`🔍 Searching for admins in department: ${department}`);

    const admins = await User.findAll({
      where: { role: "admin", occupation: department },
      attributes: ["firstName", "lastName", "email", "role", "occupation"],
    });

    console.log(
      `📋 Found ${admins.length} admins:`,
      admins.map((a) => ({ email: a.email, dept: a.occupation }))
    );

    const adminEmails = admins
      .map((u) => u.email)
      .filter((email) => email && email.trim() !== "");

    if (adminEmails.length === 0) {
      console.warn("❌ No admin emails found for task confirmation notice");
      return;
    }

    console.log(`📧 Sending emails to: ${adminEmails.join(", ")}`);

    const subject = `Task Completed: ${task.title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Task Confirmed</h2>
        <p><strong>Title:</strong> ${task.title}</p>
        <p><strong>Description:</strong> ${task.description || "-"}</p>
        <p><strong>Priority:</strong> ${task.priority}</p>
        <p><strong>Status:</strong> ${task.status}</p>
        <p><strong>Confirmed by:</strong> ${actingUser.firstName || "User"} ${
      actingUser.lastName || ""
    }</p>
        <p><strong>Department:</strong> ${task.occupation || "-"}</p>
        <p style="margin-top: 16px; color: #6c757d; font-size: 12px;">This is an automated notification.</p>
      </div>
    `;

    const emailPromises = adminEmails.map(async (email) => {
      const payload = {
        subject,
        recipient: { name: "Admin", email_address: email },
        html,
      };

      try {
        await axios.post(
          "https://api.proxy.account.redbiller.com/api/v1/resources/email/send",
          payload,
          {
            timeout: 10000,
            headers: {
              "Content-Type": "application/json",
              Key: "Email_deed4b7fdc471325783304fefbc2f574",
            },
          }
        );
        console.log(`✅ Email sent successfully to ${email}`);
      } catch (error) {
        console.error(`❌ Failed to send email to ${email}:`, error.message);
        throw error;
      }
    });

    const results = await Promise.allSettled(emailPromises);
    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - successful;
    console.log(`📊 Email summary: ${successful} sent, ${failed} failed`);
  } catch (err) {
    console.error("Failed to send task confirmed emails:", err.message);
  }
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
    occupation: user.occupation,
  });
  return res.status(201).json({
    code: 201,
    status: true,
    message: "Task created successfully",
    data: task,
  });
});

export const assignTask = TryCatchFunction(async (req, res) => {
  const { title, description, priority, status } = req.body;
  const { recipientId } = req.params;
  const userId = req.user;
  const user = await User.findByPk(userId);
  if (!user) {
    throw new ErrorClass("User not found", 404);
  }
  if (user.role !== "admin") {
    throw new ErrorClass("Only admins can assign tasks", 403);
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

  if (!recipientId) {
    throw new ErrorClass("Recipient ID is required", 400);
  }

  const recipient = await User.findByPk(recipientId);
  if (!recipient) {
    throw new ErrorClass("Recipient not found", 404);
  } else if (recipient.occupation !== user.occupation) {
    throw new ErrorClass("You can only assign tasks to your own team", 403);
  }

  const weekKey = getCurrentWeekKey();
  const userFullName = user.firstName + " " + user.lastName;
  const task = await Task.create({
    userId: recipientId,
    title,
    description,
    priority,
    status,
    weekKey,
    occupation: recipient.occupation,
    assignedBy: userFullName,
  });

  return res.status(201).json({
    code: 201,
    status: true,
    message: "Task assigned successfully",
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
  if (user.role === "admin" || user.role === "superadmin") {
    tasks = await Task.findAll();
  } else {
    tasks = await Task.findAll({ where: { userId } });
  }
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
  const { title, description, priority, status, weekKey } = req.body;
  const userId = req.user;
  const user = await User.findByPk(userId);
  if (!user) {
    throw new ErrorClass("User not found", 404);
  }
  const task = await Task.findByPk(id);
  if (!task) {
    throw new ErrorClass("Task not found", 404);
  }

  // Build update payload with only provided fields
  const updatePayload = {};
  if (title !== undefined) updatePayload.title = title;
  if (description !== undefined) updatePayload.description = description;
  if (priority !== undefined) updatePayload.priority = priority;
  if (status !== undefined) updatePayload.status = status;
  if (weekKey !== undefined) updatePayload.weekKey = weekKey;
  const previousStatus = task.status;
  await task.update(updatePayload);

  // if (
  //   status !== undefined &&
  //   status === "completed" &&
  //   previousStatus !== "comfirmed"
  // ) {
  //   console.log(
  //     `🎯 Task status changed to confirmed! Previous: ${previousStatus}, New: ${status}`
  //   );
  //   console.log(`📋 Task details:`, {
  //     id: task.id,
  //     title: task.title,
  //     occupation: task.occupation,
  //   });
  //   console.log(`👤 User details:`, {
  //     id: user.id,
  //     occupation: user.occupation,
  //     role: user.role,
  //   });

  //   // Fire-and-forget; do not block response
  //   sendTaskConfirmedEmails(task, user).catch((e) =>
  //     console.error("Background task confirmation email failed:", e.message)
  //   );
  // } else {
  //   console.log(
  //     `ℹ️ Email condition not met. Status: ${status}, Previous: ${previousStatus}`
  //   );
  // }

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
  const userFullName = user.firstName + " " + user.lastName;
  if (task.userId === userId || task.assignedBy === userFullName) {
    await task.destroy();
    return res.status(200).json({
      code: 200,
      status: true,
      message: "Task deleted successfully",
    });
  } else {
    throw new ErrorClass("You are not authorized to delete this task", 403);
  }
});

export const taskToWeeklyReport = TryCatchFunction(async (req, res) => {
  const userId = req.user;
  const user = await User.findByPk(userId);

  if (!user) {
    throw new ErrorClass("User not found", 404);
  }

  if (user.role !== "admin") {
    throw new ErrorClass("Only admins can create weekly reports", 403);
  }

  const currentWeekKey = getCurrentWeekKey();

  const tasksForCurrentWeek = await Task.findAll({
    where: {
      weekKey: currentWeekKey,
      occupation: user.occupation,
      status: ["confirmed"], // Only fetch completed or confirmed tasks for current week
    },
  });

  // Get all "to_do" and "in_progress" tasks for all time
  const tasksForAllTime = await Task.findAll({
    where: {
      occupation: user.occupation,
      status: ["to_do", "in_progress"], // Fetch "to_do" and "in_progress" tasks for all time
    },
  });

  // Get all tasks with occupation "product" for current week
  const allTasks = [...tasksForAllTime, ...tasksForCurrentWeek];

  if (!allTasks || allTasks.length === 0) {
    throw new ErrorClass("No tasks found for the product team", 404);
  }

  // Delete any existing draft for current user
  await WeeklyReport.destroy({
    where: {
      userId,
      status: "draft",
    },
  });

  // Create new draft
  const weeklyReport = await WeeklyReport.create({
    userId,
    status: "draft",
  });

  // Create report items using only task titles
  for (const task of allTasks) {
    switch (task.status) {
      case "to_do":
        await ActionItem.create({
          userId: task.userId,
          reportId: weeklyReport.id,
          description: task.description,
        });
        break;
      case "in_progress":
        await OngoingTask.create({
          userId: task.userId,
          reportId: weeklyReport.id,
          description: task.description,
        });
        break;
      case "confirmed":
        await CompletedTask.create({
          userId: task.userId,
          reportId: weeklyReport.id,
          description: task.description,
        });
        break;
    }
  }

  return res.status(201).json({
    status: true,
    message: "Weekly report created successfully",
    data: { reportId: weeklyReport.id },
  });
});
