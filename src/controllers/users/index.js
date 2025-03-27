import { TryCatchFunction } from "../../utils/tryCatch/index.js";
import { ErrorClass } from "../../utils/errorClass/index.js";
import { User } from "../../models/auth/index.js";
import { Incident } from "../../models/incedent/index.js";

export const getAllUsers = TryCatchFunction(async (req, res) => {
  const users = await User.findAll({ attributes: { exclude: ["password"] } });
  if (!users) throw new ErrorClass("Sorry no user found", 4000);
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
  console.log(id);
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
  const { userId, userStat } = req.params;
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
