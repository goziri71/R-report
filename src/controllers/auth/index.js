import { ErrorClass } from "../../utils/errorClass/index.js";
import { TryCatchFunction } from "../../utils/tryCatch/index.js";
import { User } from "../../models/auth/index.js";
import { validateCrosslinkToken } from "../../core/apiCalls.js";
import { AuthService } from "../../service/auth.service.js";
import { Config } from "../../config/config.js";
import { Op } from "sequelize";

const authService = new AuthService();

// Pre-compile validation rules
const REQUIRED_LOGIN_FIELDS = ["token"];
const UPDATABLE_FIELDS = [
  "firstName",
  "lastName",
  "middleName",
  "dob",
  "nationality",
  "occupation",
  "gender",
  "isActive",
  "role",
];

export const loginUser = TryCatchFunction(async (req, res) => {
  const { token } = req.body;

  // Fast validation
  const missingFields = REQUIRED_LOGIN_FIELDS.filter(
    (field) => !req.body[field]
  );

  if (missingFields.length > 0) {
    throw new ErrorClass(
      `Missing required fields: ${missingFields.join(", ")}`,
      422
    );
  }

  // Validate crosslink token via third-party API (centralized helper)
  const data = await validateCrosslinkToken({ token });

  if (!data) {
    throw new ErrorClass("Service temporarily down", 500);
  }

  if (data.code === 7010) {
    throw new ErrorClass("Crosslink has been used", 401);
  }

  // Normalize and validate third-party response (Redbiller crosslink)
  const root = (data && data.data) || {};
  const profile = root.profile || {};

  const thirdPartyBillerId =
    profile.redbiller_id || root.redbiller_id || root.billerId;
  const thirdPartyEmail = profile.redbiller_id || root.email || null; // redbiller_id is email-like

  // Build dynamic OR conditions only with present identifiers
  const orConditions = [];
  if (thirdPartyBillerId) orConditions.push({ billerId: thirdPartyBillerId });
  if (thirdPartyEmail) orConditions.push({ email: thirdPartyEmail });

  if (orConditions.length === 0) {
    throw new ErrorClass("missing identifier", 422);
  }

  let existingUser = await User.findOne({
    where:
      orConditions.length === 1 ? orConditions[0] : { [Op.or]: orConditions },
    attributes: ["id"],
  });

  if (!existingUser) {
    throw new ErrorClass("User not provisioned. Contact admin", 404);
  }

  if (existingUser) {
    const authToken = await authService.signToken(
      existingUser.id,
      Config.JWT_SECRET,
      "1d"
    );

    return res.status(200).json({
      status: true,
      code: 200,
      message: "Login successful",
      data: {
        authToken: authToken,
      },
    });
  }

  // // Create new user (normalized mapping with safe fallbacks)
  // const user = await User.create({
  //   firstName: thirdPartyFirstName,
  //   lastName: thirdPartyLastName,
  //   middleName: thirdPartyMiddleName,
  //   dob: thirdPartyDob,
  //   email: thirdPartyEmail || String(thirdPartyBillerId),
  //   billerId: thirdPartyBillerId,
  //   nationality: thirdPartyNationality,
  //   occupation: thirdPartyOccupation,
  //   gender: thirdPartyGender,
  // });

  // if (!user) {
  //   throw new ErrorClass(
  //     "Something went wrong while trying to create your account, kindly try again",
  //     500
  //   );
  // }

  // const authToken = await authService.signToken(
  //   user.id,
  //   Config.JWT_SECRET,
  //   "1d"
  // );

  // return res.status(201).json({
  //   status: true,
  //   code: 201,
  //   message: "Account created and logged in successfully",
  //   data: {
  //     user,
  //     authToken: authToken,
  //   },
  // });
});

export const addNewUser = TryCatchFunction(async (req, res) => {
  const {
    firstName,
    lastName,
    middleName,
    dob,
    nationality,
    occupation,
    gender,
    isActive,
    role,
    email,
    billerId,
  } = req.body;
  if (
    !firstName ||
    !lastName ||
    !middleName ||
    !dob ||
    !nationality ||
    !occupation ||
    !gender ||
    !isActive ||
    !role ||
    !email ||
    !billerId
  ) {
    throw new ErrorClass("All fields are required", 400);
  }
  const userId = req.user;
  if (!userId) {
    throw new ErrorClass("User must be logged in to add a new user", 401);
  }
  const user = await User.findByPk(userId);
  if (user.role !== "admin" && user.role !== "superadmin") {
    throw new ErrorClass(
      "User must be an admin or superadmin to add a new user",
      403
    );
  }
  const existingUser = await User.findOne({
    where: {
      [Op.or]: [{ email }, { billerId }],
    },
  });

  if (existingUser) {
    throw new ErrorClass("User already exists, cannot add duplicate user", 400);
  }

  const newUser = await User.create({
    email,
    billerId,
    firstName,
    lastName,
    middleName,
    dob,
    nationality,
    occupation,
    gender,
    isActive,
    role,
  });

  return res.status(201).json({
    status: true,
    code: 201,
    message: "User added successfully",
    data: {
      user: newUser,
    },
  });
});

export const updateUser = TryCatchFunction(async (req, res) => {
  const userID = req.user;
  const { id } = req.params;

  const requestBody = req.body;

  // Optimized field filtering
  const updateFields = {};
  let hasValidFields = false;

  for (const field of UPDATABLE_FIELDS) {
    if (requestBody[field] !== undefined) {
      updateFields[field] = requestBody[field];
      hasValidFields = true;
    }
  }

  if (!hasValidFields) {
    throw new ErrorClass("No valid fields provided for update", 400);
  }

  const currentUser = await User.findByPk(userID);
  const existingUser = await User.findByPk(id, {
    attributes: ["id", "role"],
  });

  if (!existingUser) {
    throw new ErrorClass("User not found", 404);
  }

  if (currentUser.role !== "admin" && currentUser.role !== "superadmin") {
    throw new ErrorClass(
      "Unauthorized, User must be an admin or superadmin",
      403
    );
  }
  const [updatedRowsCount] = await User.update(updateFields, {
    where: { id },
  });

  if (updatedRowsCount === 0) {
    throw new ErrorClass("Failed to update user details", 500);
  }

  const updatedUser = await User.findByPk(id);

  return res.status(200).json({
    status: true,
    code: 200,
    message: "User details updated successfully",
    data: { user: updatedUser },
  });
});
