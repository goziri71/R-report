import { ErrorClass } from "../../utils/errorClass/index.js";
import { TryCatchFunction } from "../../utils/tryCatch/index.js";
import { User } from "../../models/auth/index.js";
import {
  WeeklyReport,
  ActionItem,
  OngoingTask,
  CompletedTask,
} from "../../models/weeklyAction/index.js";
import Sequelize from "../../database/database.js";
import { Op } from "sequelize";
import axios from "axios";

const sendReportNotification = async (
  report,
  reportingUser,
  superAdminUser,
  actionItems,
  ongoingTasks,
  completedTasks
) => {
  const emailPayload = {
    subject: `Weekly Report Submitted - ${reportingUser.occupation} Department`,
    recipient: {
      name: superAdminUser.firstName || "Super Admin",
      email_address: superAdminUser.email,
    },
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
          Weekly Report Submission
        </h2>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #495057;">Report Details</h3>
          <p><strong>Submitted by:</strong> ${
            reportingUser.firstName || "User"
          } ${reportingUser.lastName || ""}</p>
          <p><strong>Email:</strong> ${reportingUser.email}</p>
          <p><strong>Department:</strong> ${reportingUser.occupation}</p>
          <p><strong>Report ID:</strong> ${report.id}</p>
          <p><strong>Submitted at:</strong> ${new Date(
            report.submittedAt
          ).toLocaleString()}</p>
        </div>

        <div style="margin: 20px 0;">
          <h3 style="color: #dc3545;">Action Items (${actionItems.length})</h3>
          ${
            actionItems.length > 0
              ? `
            <ul style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107;">
              ${actionItems
                .map(
                  (item) =>
                    `<li style="margin: 5px 0;">${
                      typeof item === "string" ? item : JSON.stringify(item)
                    }</li>`
                )
                .join("")}
            </ul>
          `
              : '<p style="color: #6c757d; font-style: italic;">No action items submitted</p>'
          }
        </div>

        <div style="margin: 20px 0;">
          <h3 style="color: #fd7e14;">Ongoing Tasks (${
            ongoingTasks.length
          })</h3>
          ${
            ongoingTasks.length > 0
              ? `
            <ul style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #fd7e14;">
              ${ongoingTasks
                .map(
                  (task) =>
                    `<li style="margin: 5px 0;">${
                      typeof task === "string" ? task : JSON.stringify(task)
                    }</li>`
                )
                .join("")}
            </ul>
          `
              : '<p style="color: #6c757d; font-style: italic;">No ongoing tasks submitted</p>'
          }
        </div>

        <div style="margin: 20px 0;">
          <h3 style="color: #28a745;">Completed Tasks (${
            completedTasks.length
          })</h3>
          ${
            completedTasks.length > 0
              ? `
            <ul style="background-color: #d4edda; padding: 15px; border-left: 4px solid #28a745;">
              ${completedTasks
                .map(
                  (task) =>
                    `<li style="margin: 5px 0;">${
                      typeof task === "string" ? task : JSON.stringify(task)
                    }</li>`
                )
                .join("")}
            </ul>
          `
              : '<p style="color: #6c757d; font-style: italic;">No completed tasks submitted</p>'
          }
        </div>

        <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin-top: 30px;">
          <p style="margin: 0; color: #495057;">
            <strong>Summary:</strong> 
            Total of ${
              actionItems.length + ongoingTasks.length + completedTasks.length
            } items submitted.
          </p>
          <p style="margin: 10px 0 0 0; color: #6c757d; font-size: 14px;">
            Please review this report in the admin dashboard.
          </p>
        </div>
      </div>
    `,
  };

  try {
    await axios.post(
      "https://api.proxy.account.redbiller.com/api/v1/resources/email/send",
      emailPayload,
      {
        timeout: 10000,
        headers: {
          "Content-Type": "application/json",
          Key: "Email_deed4b7fdc471325783304fefbc2f574",
        },
      }
    );
    console.log(
      "Weekly report notification sent successfully to:",
      superAdminUser.email
    );
  } catch (error) {
    console.error("Failed to send weekly report notification:", error.message);
    throw error;
  }
};

const getSuperAdminUsers = async () => {
  try {
    const superAdmins = await User.findAll({
      where: Sequelize.where(Sequelize.cast(Sequelize.col("role"), "text"), {
        [Op.iLike]: "%superadmin%",
      }),
      attributes: [
        "id",
        "email",
        "firstName",
        "lastName",
        "middleName",
        "role",
      ],
    });

    console.log("Found super admins:", superAdmins);
    return superAdmins;
  } catch (error) {
    console.error("Error fetching super admin users:", error);
    return [];
  }
};

const isAdmin = (user) => {
  console.log(user.role);
  if (!user.role) {
    return false;
  }
  const userRole = user.role.toLowerCase();
  const adminRoles = [
    "admin",
    "administrator",
    "dept_admin",
    "department_admin",
  ];

  return adminRoles.includes(userRole);
};

export const createWeeklyReport = TryCatchFunction(async (req, res) => {
  const {
    ActionItem: actionItemsRaw,
    OngoingTask: ongoingTasksRaw,
    CompletedTask: completedTasksRaw,
    status,
  } = req.body;

  const userId = req.user;
  if (!userId) throw new ErrorClass("User authentication required", 401);

  const userExists = await User.findByPk(userId);
  if (!userExists) throw new ErrorClass("User not found", 404);

  const actionItems = Array.isArray(actionItemsRaw)
    ? actionItemsRaw
    : actionItemsRaw
    ? [actionItemsRaw]
    : [];
  const ongoingTasks = Array.isArray(ongoingTasksRaw)
    ? ongoingTasksRaw
    : ongoingTasksRaw
    ? [ongoingTasksRaw]
    : [];
  const completedTasks = Array.isArray(completedTasksRaw)
    ? completedTasksRaw
    : completedTasksRaw
    ? [completedTasksRaw]
    : [];

  const isDraft = status === "draft";

  // For draft: allow empty payload. For submit: enforce at least one item
  if (!isDraft) {
    if (
      actionItems.length === 0 &&
      ongoingTasks.length === 0 &&
      completedTasks.length === 0
    ) {
      throw new ErrorClass("At least one task is required", 400);
    }
  }

  const transaction = await Sequelize.transaction();

  try {
    let report;
    let isUpdate = false;

    if (isDraft) {
      // Check if user already has a draft report
      const existingDraft = await WeeklyReport.findOne({
        where: { userId, status: "draft" },
        transaction,
      });

      if (existingDraft) {
        // Update existing draft
        report = existingDraft;
        isUpdate = true;

        // Delete existing items for this draft
        await Promise.all([
          ActionItem.destroy({
            where: { reportId: report.id, userId },
            transaction,
          }),
          OngoingTask.destroy({
            where: { reportId: report.id, userId },
            transaction,
          }),
          CompletedTask.destroy({
            where: { reportId: report.id, userId },
            transaction,
          }),
        ]);

        // Update the draft's lastSavedAt
        await report.update(
          {
            lastSavedAt: new Date(),
          },
          { transaction }
        );
      } else {
        // Create new draft
        report = await WeeklyReport.create(
          {
            userId,
            department: userExists.occupation,
            status: "draft",
            submittedAt: null,
            lastSavedAt: new Date(),
          },
          { transaction }
        );
      }
    } else {
      // status === "submitted"
      // If a draft exists for this user, delete it (and its items) to avoid duplicates
      const existingDrafts = await WeeklyReport.findAll({
        where: { userId, status: "draft" },
        transaction,
      });

      if (existingDrafts?.length) {
        for (const draft of existingDrafts) {
          await Promise.all([
            ActionItem.destroy({
              where: { reportId: draft.id, userId },
              transaction,
            }),
            OngoingTask.destroy({
              where: { reportId: draft.id, userId },
              transaction,
            }),
            CompletedTask.destroy({
              where: { reportId: draft.id, userId },
              transaction,
            }),
          ]);
          await draft.destroy({ transaction });
        }
      }

      // Create a fresh submitted report
      report = await WeeklyReport.create(
        {
          userId,
          department: userExists.occupation,
          status: "submitted",
          submittedAt: new Date(),
          lastSavedAt: new Date(),
        },
        { transaction }
      );
    }

    const createItem = (Model, item, reportId, department) =>
      Model.create(
        {
          userId,
          reportId,
          department,
          description: typeof item === "string" ? item : JSON.stringify(item),
        },
        { transaction }
      );

    // Create new items
    const createPromises = [];

    if (actionItems.length > 0) {
      createPromises.push(
        Promise.all(
          actionItems.map((item) =>
            createItem(ActionItem, item, report.id, userExists.occupation)
          )
        )
      );
    }

    if (ongoingTasks.length > 0) {
      createPromises.push(
        Promise.all(
          ongoingTasks.map((task) =>
            createItem(OngoingTask, task, report.id, userExists.occupation)
          )
        )
      );
    }

    if (completedTasks.length > 0) {
      createPromises.push(
        Promise.all(
          completedTasks.map((task) =>
            createItem(CompletedTask, task, report.id, userExists.occupation)
          )
        )
      );
    }

    if (createPromises.length > 0) {
      await Promise.all(createPromises);
    }

    // Send notifications only for submitted reports and only when author is admin
    if (!isDraft && isAdmin(userExists)) {
      try {
        const superAdmins = await getSuperAdminUsers();
        if (superAdmins.length > 0) {
          await Promise.all(
            superAdmins.map((superAdmin) =>
              sendReportNotification(
                report,
                userExists,
                superAdmin,
                actionItems,
                ongoingTasks,
                completedTasks
              )
            )
          );
        }
      } catch (emailError) {
        console.error(
          "Email notification failed, but report was created/updated successfully:",
          emailError
        );
      }
    }

    await transaction.commit();

    const message = isDraft
      ? isUpdate
        ? "Draft updated successfully"
        : "Draft saved successfully"
      : "Weekly Report submitted successfully";

    res.status(isDraft && isUpdate ? 200 : 201).json({
      code: isDraft && isUpdate ? 200 : 201,
      status: "successful",
      message,
      report: {
        id: report.id,
        userId: report.userId,
        department: report.department,
        status: report.status,
        submittedAt: report.submittedAt,
        lastSavedAt: report.lastSavedAt,
      },
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

// Save or update an existing draft by ID (owner only)
export const saveDraft = TryCatchFunction(async (req, res) => {
  const { reportId } = req.params;
  const {
    ActionItem: actionItemsRaw,
    OngoingTask: ongoingTasksRaw,
    CompletedTask: completedTasksRaw,
    meta,
  } = req.body || {};
  const userId = req.user;

  const report = await WeeklyReport.findOne({
    where: { id: reportId, userId },
  });
  if (!report) throw new ErrorClass("Draft report not found", 404);
  if (report.status !== "draft")
    throw new ErrorClass("Report is not a draft", 400);

  // Update optional metadata
  if (meta) {
    await report.update({ ...meta, lastSavedAt: new Date() });
  } else {
    await report.update({ lastSavedAt: new Date() });
  }

  const actionItems = Array.isArray(actionItemsRaw)
    ? actionItemsRaw
    : actionItemsRaw
    ? [actionItemsRaw]
    : [];
  const ongoingTasks = Array.isArray(ongoingTasksRaw)
    ? ongoingTasksRaw
    : ongoingTasksRaw
    ? [ongoingTasksRaw]
    : [];
  const completedTasks = Array.isArray(completedTasksRaw)
    ? completedTasksRaw
    : completedTasksRaw
    ? [completedTasksRaw]
    : [];

  // For simplicity: append new items provided on each save
  const createItem = (Model, item) =>
    Model.create({
      userId,
      reportId: report.id,
      department: report.department,
      description: typeof item === "string" ? item : JSON.stringify(item),
    });

  const ops = [];
  if (actionItems.length > 0)
    ops.push(Promise.all(actionItems.map((i) => createItem(ActionItem, i))));
  if (ongoingTasks.length > 0)
    ops.push(Promise.all(ongoingTasks.map((i) => createItem(OngoingTask, i))));
  if (completedTasks.length > 0)
    ops.push(
      Promise.all(completedTasks.map((i) => createItem(CompletedTask, i)))
    );

  if (ops.length) await Promise.all(ops);

  res.status(200).json({
    code: 200,
    status: true,
    message: "Draft saved",
    report: {
      id: report.id,
      status: report.status,
      lastSavedAt: report.lastSavedAt,
    },
  });
});

export const submitDraft = TryCatchFunction(async (req, res) => {
  const { reportId } = req.params;
  const userId = req.user;

  const [report, user] = await Promise.all([
    WeeklyReport.findOne({ where: { id: reportId, userId } }),
    User.findByPk(userId),
  ]);

  if (!report) throw new ErrorClass("Draft report not found", 404);
  if (report.status !== "draft")
    throw new ErrorClass("Report is not a draft", 400);

  // Validate presence of at least one item
  const [aiCount, ogCount, cmCount] = await Promise.all([
    ActionItem.count({ where: { reportId: report.id, userId } }),
    OngoingTask.count({ where: { reportId: report.id, userId } }),
    CompletedTask.count({ where: { reportId: report.id, userId } }),
  ]);

  if (aiCount + ogCount + cmCount === 0) {
    throw new ErrorClass("At least one task is required to submit", 400);
  }

  const transaction = await Sequelize.transaction();

  try {
    // Get all items from the draft
    const [actionItems, ongoingTasks, completedTasks] = await Promise.all([
      ActionItem.findAll({
        where: { reportId: report.id, userId },
        transaction,
      }),
      OngoingTask.findAll({
        where: { reportId: report.id, userId },
        transaction,
      }),
      CompletedTask.findAll({
        where: { reportId: report.id, userId },
        transaction,
      }),
    ]);

    // Create new submitted report
    const submittedReport = await WeeklyReport.create(
      {
        userId,
        department: report.department,
        status: "submitted",
        submittedAt: new Date(),
        lastSavedAt: new Date(),
      },
      { transaction }
    );

    // Create new items for the submitted report
    const createPromises = [];

    if (actionItems.length > 0) {
      createPromises.push(
        Promise.all(
          actionItems.map((item) =>
            ActionItem.create(
              {
                userId,
                reportId: submittedReport.id,
                department: item.department,
                description: item.description,
              },
              { transaction }
            )
          )
        )
      );
    }

    if (ongoingTasks.length > 0) {
      createPromises.push(
        Promise.all(
          ongoingTasks.map((task) =>
            OngoingTask.create(
              {
                userId,
                reportId: submittedReport.id,
                department: task.department,
                description: task.description,
              },
              { transaction }
            )
          )
        )
      );
    }

    if (completedTasks.length > 0) {
      createPromises.push(
        Promise.all(
          completedTasks.map((task) =>
            CompletedTask.create(
              {
                userId,
                reportId: submittedReport.id,
                department: task.department,
                description: task.description,
              },
              { transaction }
            )
          )
        )
      );
    }

    if (createPromises.length > 0) {
      await Promise.all(createPromises);
    }

    // Delete all items from the original draft
    await Promise.all([
      ActionItem.destroy({
        where: { reportId: report.id, userId },
        transaction,
      }),
      OngoingTask.destroy({
        where: { reportId: report.id, userId },
        transaction,
      }),
      CompletedTask.destroy({
        where: { reportId: report.id, userId },
        transaction,
      }),
    ]);

    // Delete the draft report
    await WeeklyReport.destroy({
      where: { id: report.id, userId },
      transaction,
    });

    // Send notifications if admin
    if (isAdmin(user)) {
      try {
        const superAdmins = await getSuperAdminUsers();
        if (superAdmins.length > 0) {
          await Promise.all(
            superAdmins.map((superAdmin) =>
              sendReportNotification(
                submittedReport,
                user,
                superAdmin,
                actionItems.map((x) => x.description),
                ongoingTasks.map((x) => x.description),
                completedTasks.map((x) => x.description)
              )
            )
          );
        }
      } catch (emailError) {
        console.error("Email notification failed after submit:", emailError);
      }
    }

    await transaction.commit();

    res.status(200).json({
      code: 200,
      status: true,
      message: "Draft submitted successfully",
      report: {
        id: submittedReport.id,
        status: submittedReport.status,
        submittedAt: submittedReport.submittedAt,
      },
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

// Get a particular user's draft by user ID
export const getMyDrafts = TryCatchFunction(async (req, res) => {
  const { userId: targetUserId } = req.params; // Get userId from URL params
  const currentUserId = req.user; // Current authenticated user

  // Validate that the target user exists
  const targetUser = await User.findByPk(targetUserId);
  if (!targetUser) {
    throw new ErrorClass("Target user not found", 404);
  }

  // Get the current user for authorization checks
  const currentUser = await User.findByPk(currentUserId);
  if (!currentUser) {
    throw new ErrorClass("Current user not found", 404);
  }

  // Authorization: Everyone can only view their own drafts
  if (currentUserId !== parseInt(targetUserId)) {
    if (currentUser.role === "user" || currentUser.role === "admin") {
      throw new ErrorClass(
        "Unauthorized: You can only view your own drafts",
        403
      );
    }
    // Only superadmin can view other users' drafts
    if (currentUser.role !== "superadmin") {
      throw new ErrorClass(
        "Unauthorized: You can only view your own drafts",
        403
      );
    }
  }

  const drafts = await WeeklyReport.findAll({
    where: { userId: targetUserId, status: "draft" },
    include: [
      {
        model: ActionItem,
        required: false,
        attributes: ["id", "description", "createdAt"],
      },
      {
        model: OngoingTask,
        required: false,
        attributes: ["id", "description", "createdAt"],
      },
      {
        model: CompletedTask,
        required: false,
        attributes: ["id", "description", "createdAt"],
      },
      {
        model: User,
        attributes: ["id", "firstName", "lastName", "occupation", "role"],
      },
    ],
    order: [["lastSavedAt", "DESC"]],
  });

  return res.status(200).json({
    code: 200,
    status: true,
    message: "Draft weekly reports retrieved successfully",
    data: {
      user: {
        id: targetUser.id,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        occupation: targetUser.occupation,
        role: targetUser.role,
      },
      drafts: drafts.map((draft) => {
        const { User, ...rest } = draft.toJSON();
        return rest;
      }),
    },
  });
});

export const getAllDepertmentReport = TryCatchFunction(async (req, res) => {
  const userId = req.user;
  const currentUser = await User.findByPk(userId);

  if (!currentUser) {
    throw new ErrorClass("User not found", 404);
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 100;
  const offset = (page - 1) * limit;

  if (page < 1) throw new ErrorClass("Page number must be greater than 0", 400);
  if (limit < 1 || limit > 100)
    throw new ErrorClass("Limit must be between 1 and 100", 400);

  const queryOptions = {
    where: { status: "submitted" },
    include: [
      {
        model: User,
        attributes: ["id", "firstName", "lastName", "occupation", "role"],
        where: {},
      },
      {
        model: ActionItem,
        required: false,
        attributes: ["id", "description", "createdAt"],
      },
      {
        model: OngoingTask,
        required: false,
        attributes: ["id", "description", "createdAt"],
      },
      {
        model: CompletedTask,
        required: false,
        attributes: ["id", "description", "createdAt"],
      },
    ],
    order: [["submittedAt", "DESC"]],
    limit,
    offset,
    distinct: true,
  };

  if (currentUser.role === "superadmin") {
    queryOptions.include[0].where = {
      role: "admin",
      id: { [Op.ne]: currentUser.id },
    };
  } else if (currentUser.role === "admin") {
    queryOptions.where.department = currentUser.occupation;
    queryOptions.include[0].where = {
      occupation: currentUser.occupation,
      role: ["user", "admin"],
    };
  } else if (currentUser.role === "user") {
    queryOptions.where.userId = userId;
  } else {
    throw new ErrorClass("Unauthorized role", 403);
  }

  const { count: totalReports, rows: reports } =
    await WeeklyReport.findAndCountAll(queryOptions);

  const totalPages = Math.ceil(totalReports / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  const responseData =
    currentUser.role === "user"
      ? {
          user: {
            id: currentUser.id,
            firstName: currentUser.firstName,
            lastName: currentUser.lastName,
            occupation: currentUser.occupation,
            role: currentUser.role,
          },
          reports: reports.map((report) => {
            const { User, ...rest } = report.toJSON();
            return rest;
          }),
        }
      : reports;

  return res.status(200).json({
    code: 200,
    status: "successful",
    message: "Weekly Reports retrieved successfully",
    data: responseData,
    pagination: {
      currentPage: page,
      totalPages,
      totalReports,
      reportsPerPage: limit,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null,
    },
  });
});

export const editeWeeklyReport = TryCatchFunction(async (req, res) => {
  const currentUserId = req.user;
  const { targetUser } = req.params;
  const {
    ActionItem: actionItems,
    OngoingTask: ongoingTasks,
    CompletedTask: completedTasks,
  } = req.body;

  if (!actionItems && !ongoingTasks && !completedTasks) {
    throw new ErrorClass("At least one field is required to update", 400);
  }

  const [currentUser, targetUserDetails] = await Promise.all([
    User.findByPk(currentUserId),
    User.findByPk(targetUser),
  ]);

  if (!currentUser) throw new ErrorClass("User not found", 404);

  if (currentUser.role !== "admin")
    throw new ErrorClass("Unauthorized user, admin only", 403);

  if (!targetUserDetails) throw new ErrorClass("Target user not found", 404);

  const transaction = await Sequelize.transaction();
  const validateItemsExist = async (Model, items, modelName) => {
    if (!items?.length) return [];
    const ids = items.map((item) => item.id);
    const count = await Model.count({
      where: { id: ids, userId: targetUser },
      transaction,
    });
    if (count !== items.length) {
      throw new ErrorClass(`Some ${modelName} not found for this user`, 404);
    }
    return items;
  };
  const [validActionItems, validOngoingTasks, validCompletedTasks] =
    await Promise.all([
      validateItemsExist(ActionItem, actionItems, "action items"),
      validateItemsExist(OngoingTask, ongoingTasks, "ongoing tasks"),
      validateItemsExist(CompletedTask, completedTasks, "completed tasks"),
    ]);
  const updatePromises = [];
  if (validActionItems.length) {
    updatePromises.push(
      Promise.all(
        validActionItems.map((item) =>
          ActionItem.update(
            { description: item.description, updatedAt: new Date() },
            { where: { id: item.id, userId: targetUser }, transaction }
          )
        )
      )
    );
  }
  if (validOngoingTasks.length) {
    updatePromises.push(
      Promise.all(
        validOngoingTasks.map((item) =>
          OngoingTask.update(
            { description: item.description, updatedAt: new Date() },
            { where: { id: item.id, userId: targetUser }, transaction }
          )
        )
      )
    );
  }
  if (validCompletedTasks.length) {
    updatePromises.push(
      Promise.all(
        validCompletedTasks.map((item) =>
          CompletedTask.update(
            { description: item.description, updatedAt: new Date() },
            { where: { id: item.id, userId: targetUser }, transaction }
          )
        )
      )
    );
  }
  if (updatePromises.length) {
    await Promise.all(updatePromises);
  }
  await transaction.commit();
  res.status(200).json({
    code: 200,
    status: true,
    message: "Weekly report updated successfully",
  });
});

export const deleteWeeklyReport = TryCatchFunction(async (req, res) => {
  const currentUserId = req.user;
  const { targetUser, reportid } = req.params;

  const [currentUser, targetUserDetails] = await Promise.all([
    User.findByPk(currentUserId),
    User.findByPk(targetUser),
  ]);

  if (!currentUser) throw new ErrorClass("User not found", 404);
  if (currentUser.role !== "admin")
    throw new ErrorClass("Unauthorized user, admin only", 403);
  if (!targetUserDetails) throw new ErrorClass("Target user not found", 404);

  // Add validation for reportid
  if (!reportid) {
    throw new ErrorClass("Report ID is required", 400);
  }

  const transaction = await Sequelize.transaction();

  try {
    // Check if the weekly report exists for this user
    const weeklyReportExists = await WeeklyReport.findOne({
      where: { id: reportid, userId: targetUser },
      transaction,
    });

    if (!weeklyReportExists) {
      throw new ErrorClass("Weekly report not found for this user", 404);
    }

    // Delete all related items first (child records)
    const [deletedActionItems, deletedOngoingTasks, deletedCompletedTasks] =
      await Promise.all([
        ActionItem.destroy({
          where: { reportId: reportid, userId: targetUser },
          transaction,
        }),
        OngoingTask.destroy({
          where: { reportId: reportid, userId: targetUser },
          transaction,
        }),
        CompletedTask.destroy({
          where: { reportId: reportid, userId: targetUser },
          transaction,
        }),
      ]);

    // Delete the main weekly report (parent record)
    const deletedWeeklyReport = await WeeklyReport.destroy({
      where: { id: reportid, userId: targetUser },
      transaction,
    });

    await transaction.commit();

    res.status(200).json({
      code: 200,
      status: true,
      message: "Weekly report and all related items deleted successfully",
      data: {
        reportId: reportid,
        deletedWeeklyReport,
        deletedActionItems,
        deletedOngoingTasks,
        deletedCompletedTasks,
        totalDeleted:
          deletedWeeklyReport +
          deletedActionItems +
          deletedOngoingTasks +
          deletedCompletedTasks,
      },
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});
