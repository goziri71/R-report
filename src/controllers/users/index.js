import { TryCatchFunction } from "../../utils/tryCatch/index.js";
import { ErrorClass } from "../../utils/errorClass/index.js";
import { User } from "../../models/auth/index.js";
import { Incident } from "../../models/incedent/index.js";

export const getAllUsers = TryCatchFunction(async (req, res) => {
  const users = await User.findAll({
    where: { isActive: true },
    attributes: { exclude: ["password"] },
  });
  if (!users) throw new ErrorClass("Sorry no user found", 4000);
  if (!users || users.length === 0) {
    throw new ErrorClass("Sorry no user found", 4000);
  }
  return res.status(200).json({
    status: true,
    code: 200,
    data: {
      users,
    },
  });
});

export const getSingleUserDetails = TryCatchFunction(async (req, res) => {
  const { id } = req.params;
  if (!id) {
    throw new ErrorClass("User Id is required", 400);
  }
  const singleUser = await User.findByPk(id);
  if (!singleUser) {
    throw new ErrorClass("user not found", 404);
  }
  const userIncident = await Incident.findAll({
    where: {
      userId: id,
    },
    order: [["createdAt", "DESC"]],
  });
  return res.status(200).json({
    status: true,
    code: 200,
    data: {
      user: singleUser,
      Incident: userIncident,
      totalIncidents: userIncident.length,
    },
  });
});

export const deleteUser = TryCatchFunction(async (req, res) => {
  const { id } = req.params;
  if (!id) {
    throw new ErrorClass("user id is required", 400);
  }

  const findUserID = await User.findByPk(id);
  if (!findUserID) {
    throw new ErrorClass("user not found", 404);
  }
  await findUserID.destroy();
  return res.status(200).json({
    status: true,
    code: 200,
    message: "user has been deleted successfully",
  });
});

export const userStatus = TryCatchFunction(async (req, res) => {
  const userID = req.user;
  const { userId, userStat } = req.params;

  const currentUser = await User.findByPk(userID);
  if (!currentUser) {
    throw new ErrorClass("User not found", 404);
  }
  if (currentUser.role !== "admin" && currentUser.role !== "superadmin") {
    throw new ErrorClass("Unathorized, User must be admin or superadmin", 403);
  }

  if (!userId) {
    throw new ErrorClass("user id required", 400);
  }

  const user = await User.findByPk(userId);
  if (!user) {
    throw new ErrorClass("user not found", 404);
  }
  user.isActive = userStat;
  await user.save();
  return res.status(200).json({
    status: true,
    code: 200,
    message:
      userStat === "true"
        ? "user has been activated!"
        : "user has been deactivated",
  });
});

export const updateUserRole = TryCatchFunction(async (req, res) => {
  const { userId } = req.params;
  const { type } = req.body;
  if (!userId) {
    throw new ErrorClass("Userid is required", 400);
  }
  if (!type || !["user", "admin"].includes(type)) {
    throw new ErrorClass("Valid user role is required", 400);
  }
  const user = await User.findByPk(userId);
  if (!user) {
    throw new ErrorClass("User not found", 404);
  }
  user.type = type;
  await User.update({ type: "admin" }, { where: { id: userId } });
  return res.status(200).json({
    status: true,
    code: 200,
    message: `User role updated to ${type} successfully`,
  });
});
