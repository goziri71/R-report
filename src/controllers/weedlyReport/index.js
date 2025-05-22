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
  console.log(userId);
  if (!userId) {
    throw new ErrorClass("User authentication required", 401);
  }
  const userExists = await User.findByPk(userId);
  if (!userExists) {
    throw new ErrorClass("User not found", 404);
  }

  const department = userExists.occupation;

  if (
    actionItems.length === 0 &&
    ongoingTasks.length === 0 &&
    completedTasks.length === 0
  ) {
    throw new ErrorClass("At least one task is required", 400);
  }

  const report = await WeeklyReport.create({
    userId,
    department: userExists.occupation,
    submittedAt: new Date(),
  });

  if (actionItems.length > 0) {
    const actionPromises = actionItems.map((item) => {
      return ActionItem.create({
        userId: userId,
        reportId: report.id,
        department: userExists.occupation,
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
        department: userExists.occupation,
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
        department,
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
      department: report.department,
      submittedAt: report.submittedAt,
    },
  });
});

export const getAllDepertmentReport = TryCatchFunction(async (req, res) => {
  const userId = req.user;
  const currentUser = await User.findByPk(userId);
  if (!currentUser) {
    throw new ErrorClass("user not found", 404);
  }
  if (currentUser.role !== "admin") {
    throw new ErrorClass(
      "Unauthorized: Only admins can access department reports",
      403
    );
  }
  const adminDepartment = currentUser.occupation;

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  if (page < 1) {
    throw new ErrorClass("Page number must be greater than 0", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new ErrorClass("Limit must be between 1 and 100", 400);
  }

  const { count: totalReports, rows: departmentReports } =
    await WeeklyReport.findAndCountAll({
      include: [
        {
          model: User,
          where: {
            occupation: adminDepartment,
          },
          attributes: ["id", "firstName", "lastName", "occupation", "role"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: limit,
      offset: offset,
      distinct: true,
    });
  const totalPages = Math.ceil(totalReports / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return res.status(200).json({
    code: 200,
    status: "successful",
    message: "Weekly Report retrieved successfully",
    data: departmentReports,
    pagination: {
      currentPage: page,
      totalPages: totalPages,
      totalReports: totalReports,
      reportsPerPage: limit,
      hasNextPage: hasNextPage,
      hasPrevPage: hasPrevPage,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null,
    },
  });
});
