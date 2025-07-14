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

  if (isAdmin(userExists)) {
    try {
      const superAdmins = await getSuperAdminUsers();
      if (superAdmins.length > 0) {
        const emailPromises = superAdmins.map((superAdmin) =>
          sendReportNotification(
            report,
            userExists,
            superAdmin,
            actionItems,
            ongoingTasks,
            completedTasks
          )
        );

        await Promise.all(emailPromises);
        console.log(
          `Email notifications sent to ${superAdmins.length} super admin(s) for admin report submission`
        );
      } else {
        console.warn("No super admin users found to send email notification");
      }
    } catch (emailError) {
      console.error(
        "Email notification failed, but report was created successfully:",
        emailError
      );
    }
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

// import { ErrorClass } from "../../utils/errorClass/index.js";
// import { TryCatchFunction } from "../../utils/tryCatch/index.js";
// import { User } from "../../models/auth/index.js";
// import {
//   WeeklyReport,
//   ActionItem,
//   OngoingTask,
//   CompletedTask,
// } from "../../models/weeklyAction/index.js";
// import Sequelize from "../../database/database.js";
// import { Op } from "sequelize";

// export const createWeeklyReport = TryCatchFunction(async (req, res) => {
//   if (
//     !req.body ||
//     !req.body.ActionItem ||
//     !req.body.OngoingTask ||
//     !req.body.CompletedTask
//   ) {
//     throw new ErrorClass(
//       "ActionItem, OngoingTask, and CompletedTask are required",
//       400
//     );
//   }

//   let actionItems = req.body.ActionItem;
//   let ongoingTasks = req.body.OngoingTask;
//   let completedTasks = req.body.CompletedTask;

//   actionItems = Array.isArray(actionItems) ? actionItems : [actionItems];
//   ongoingTasks = Array.isArray(ongoingTasks) ? ongoingTasks : [ongoingTasks];
//   completedTasks = Array.isArray(completedTasks)
//     ? completedTasks
//     : [completedTasks];

//   const userId = req.user;
//   if (!userId) {
//     throw new ErrorClass("User authentication required", 401);
//   }
//   const userExists = await User.findByPk(userId);
//   if (!userExists) {
//     throw new ErrorClass("User not found", 404);
//   }

//   const department = userExists.occupation;

//   if (
//     actionItems.length === 0 &&
//     ongoingTasks.length === 0 &&
//     completedTasks.length === 0
//   ) {
//     throw new ErrorClass("At least one task is required", 400);
//   }

//   const report = await WeeklyReport.create({
//     userId,
//     department: userExists.occupation,
//     submittedAt: new Date(),
//   });

//   if (actionItems.length > 0) {
//     const actionPromises = actionItems.map((item) => {
//       return ActionItem.create({
//         userId: userId,
//         reportId: report.id,
//         department: userExists.occupation,
//         description: typeof item === "string" ? item : JSON.stringify(item),
//       });
//     });
//     await Promise.all(actionPromises);
//   }

//   if (ongoingTasks.length > 0) {
//     const ongoingPromises = ongoingTasks.map((task) => {
//       return OngoingTask.create({
//         userId: userId,
//         reportId: report.id,
//         department: userExists.occupation,
//         description: typeof task === "string" ? task : JSON.stringify(task),
//       });
//     });
//     await Promise.all(ongoingPromises);
//   }

//   if (completedTasks.length > 0) {
//     const completedPromises = completedTasks.map((task) => {
//       return CompletedTask.create({
//         userId: userId,
//         reportId: report.id,
//         department,
//         description: typeof task === "string" ? task : JSON.stringify(task),
//       });
//     });
//     await Promise.all(completedPromises);
//   }

//   res.status(201).json({
//     code: 201,
//     status: "successful",
//     message: "Weekly Report created successfully",
//     report: {
//       id: report.id,
//       userId: report.userId,
//       department: report.department,
//       submittedAt: report.submittedAt,
//     },
//   });
// });

// export const getAllDepertmentReport = TryCatchFunction(async (req, res) => {
//   const userId = req.user;

//   const currentUser = await User.findByPk(userId);
//   if (!currentUser) {
//     throw new ErrorClass("User not found", 404);
//   }

//   const page = parseInt(req.query.page) || 1;
//   const limit = parseInt(req.query.limit) || 100;
//   const offset = (page - 1) * limit;

//   if (page < 1) {
//     throw new ErrorClass("Page number must be greater than 0", 400);
//   }
//   if (limit < 1 || limit > 100) {
//     throw new ErrorClass("Limit must be between 1 and 100", 400);
//   }

//   const queryOptions = {
//     where: {},
//     include: [
//       {
//         model: User,
//         attributes: ["id", "firstName", "lastName", "occupation", "role"],
//       },
//       {
//         model: ActionItem,
//         required: false,
//         attributes: ["id", "description", "createdAt"],
//       },
//       {
//         model: OngoingTask,
//         required: false,
//         attributes: ["id", "description", "createdAt"],
//       },
//       {
//         model: CompletedTask,
//         required: false,
//         attributes: ["id", "description", "createdAt"],
//       },
//     ],
//     order: [["submittedAt", "DESC"]],
//     limit,
//     offset,
//     distinct: true,
//   };

//   if (currentUser.role === "admin") {
//     queryOptions.where.department = currentUser.occupation;
//     queryOptions.include[0].where = { occupation: currentUser.occupation };
//   } else if (currentUser.role === "user") {
//     queryOptions.where.userId = userId;
//   } else {
//     throw new ErrorClass("Unauthorized role", 403);
//   }

//   const { count: totalReports, rows: reports } =
//     await WeeklyReport.findAndCountAll(queryOptions);

//   const totalPages = Math.ceil(totalReports / limit);
//   const hasNextPage = page < totalPages;
//   const hasPrevPage = page > 1;

//   let responseData;
//   if (currentUser.role === "user") {
//     responseData = {
//       user: {
//         id: currentUser.id,
//         firstName: currentUser.firstName,
//         lastName: currentUser.lastName,
//         occupation: currentUser.occupation,
//         role: currentUser.role,
//       },
//       reports: reports.map((report) => {
//         const { User, ...rest } = report.toJSON();
//         return rest;
//       }),
//     };
//   } else {
//     responseData = reports;
//   }

//   return res.status(200).json({
//     code: 200,
//     status: "successful",
//     message: "Weekly Reports retrieved successfully",
//     data: responseData,
//     pagination: {
//       currentPage: page,
//       totalPages,
//       totalReports,
//       reportsPerPage: limit,
//       hasNextPage,
//       hasPrevPage,
//       nextPage: hasNextPage ? page + 1 : null,
//       prevPage: hasPrevPage ? page - 1 : null,
//     },
//   });
// });

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
    where: {},
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

// export const getAllAdminReport = TryCatchFunction(async (req, res) => {
//   const currentUserId = req.user;
//   const currentUser = await User.findByPk(currentUserId);
//   if (!currentUser) {
//     throw new ErrorClass("user not found", 404);
//   }
//   if (currentUser.role !== "superAdmin") {
//     throw new ErrorClass("unauthorized user, SuperAdmin only", 403);
//   }
// });

export const editeWeeklyReport = TryCatchFunction(async (req, res) => {
  const currentUserId = req.user;
  const { targetUser } = req.params;
  const {
    ActionItem: actionItems,
    OngoingTask: ongoingTasks,
    CompletedTask: completedTasks,
  } = req.body;

  const [currentUser, targetUserDetails] = await Promise.all([
    User.findByPk(currentUserId),
    User.findByPk(targetUser),
  ]);
  if (!currentUser) throw new ErrorClass("User not found", 404);
  if (currentUser.role !== "admin")
    throw new ErrorClass("Unauthorized user, admin only", 403);
  if (!targetUserDetails) throw new ErrorClass("Target user not found", 404);
  const transaction = await Sequelize.transaction();
  const prepareBulkUpdate = async (Model, items, modelName) => {
    if (!items?.length) return null;
    const ids = items.map((item) => item.id);
    const count = await Model.count({
      where: { id: ids, userId: targetUser },
      transaction,
    });
    if (count !== items.length) {
      throw new ErrorClass(`Some ${modelName} not found for this user`, 404);
    }
    return items.map((item) => ({
      id: item.id,
      userId: targetUser,
      description: item.description,
      updatedAt: new Date(),
    }));
  };
  const [actionItemUpdates, ongoingTaskUpdates, completedTaskUpdates] =
    await Promise.all([
      prepareBulkUpdate(ActionItem, actionItems, "action items"),
      prepareBulkUpdate(OngoingTask, ongoingTasks, "ongoing tasks"),
      prepareBulkUpdate(CompletedTask, completedTasks, "completed tasks"),
    ]);
  const updatePromises = [];
  if (actionItemUpdates) {
    updatePromises.push(
      ActionItem.bulkCreate(actionItemUpdates, {
        updateOnDuplicate: ["description", "updatedAt"],
        transaction,
      })
    );
  }
  if (ongoingTaskUpdates) {
    updatePromises.push(
      OngoingTask.bulkCreate(ongoingTaskUpdates, {
        updateOnDuplicate: ["description", "updatedAt"],
        transaction,
      })
    );
  }
  if (completedTaskUpdates) {
    updatePromises.push(
      CompletedTask.bulkCreate(completedTaskUpdates, {
        updateOnDuplicate: ["description", "updatedAt"],
        transaction,
      })
    );
  }
  await Promise.all(updatePromises);
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
