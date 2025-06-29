// import { ErrorClass } from "../../utils/errorClass/index.js";
// import { TryCatchFunction } from "../../utils/tryCatch/index.js";
// import { User } from "../../models/auth/index.js";
// import { loginFromAlpha } from "../../core/apiCalls.js";
// import { AuthService } from "../../service/auth.service.js";
// import { Config } from "../../config/config.js";

// const authService = new AuthService();

// export const loginUser = TryCatchFunction(async (req, res) => {
//   const { email_address, password } = req.body;
//   const missingFields = [];
//   if (!email_address) missingFields.push("email");
//   if (!password) missingFields.push("password");
//   if (missingFields.length > 0) {
//     throw new ErrorClass(
//       `Missing required fields: ${missingFields.join(", ")}`,
//       422
//     );
//   }
//   const data = await loginFromAlpha({ email_address, password });

//   if (data.status === false) {
//     throw new ErrorClass("invalid password", 401);
//   }

//   if (!data) throw new ErrorClass("Service temporarily down", 500);
//   let existingUser = await User.findOne({
//     where: { email: data.data.email },
//   });

//   if (existingUser) {
//     const token = await authService.signToken(
//       existingUser.id,
//       Config.JWT_SECRET,
//       "1d"
//     );

//     return res.status(200).json({
//       status: true,
//       code: 200,
//       message: "Login successful",
//       data: {
//         authToken: token,
//       },
//     });
//   }

//   const user = await User.create({
//     firstName: data.data.firstName,
//     lastName: data.data.lastName,
//     middleName: data.data.middleName,
//     dob: data.data.dob,
//     email: data.data.email,
//     billerId: data.data.billerId,
//     nationality: data.data.nationality,
//     occupation: data.data.occupation,
//     gender: data.data.gender,
//   });

//   if (!user) {
//     throw new ErrorClass(
//       "Something went wrong while trying to create your account, kindly try again",
//       500
//     );
//   }
//   const token = await authService.signToken(user.id, Config.JWT_SECRET, "1d");
//   return res.status(201).json({
//     status: true,
//     code: 201,
//     message: "Account created and logged in successfully",
//     data: {
//       user,
//       authToken: token,
//     },
//   });
// });

// export const updateUser = TryCatchFunction(async (req, res) => {
//   const { id } = req.params; // or req.user.id if using auth middleware
//   const {
//     firstName,
//     lastName,
//     middleName,
//     dob,
//     nationality,
//     occupation,
//     gender,
//     isActive,
//     role,
//   } = req.body;

//   const existingUser = await User.findByPk(id);
//   if (!existingUser) {
//     throw new ErrorClass("User not found", 404);
//   }
//   if (!existingUser.role === "admin") {
//     throw new ErrorClass("Unathorized, User must be an admin");
//   }

//   const updateFields = {};
//   if (firstName !== undefined) updateFields.firstName = firstName;
//   if (lastName !== undefined) updateFields.lastName = lastName;
//   if (middleName !== undefined) updateFields.middleName = middleName;
//   if (dob !== undefined) updateFields.dob = dob;
//   if (nationality !== undefined) updateFields.nationality = nationality;
//   if (occupation !== undefined) updateFields.occupation = occupation;
//   if (gender !== undefined) updateFields.gender = gender;
//   if (isActive !== undefined) updateFields.isActive = isActive;
//   if (role !== undefined) updateFields.role = role;

//   if (Object.keys(updateFields).length === 0) {
//     throw new ErrorClass("No valid fields provided for update", 400);
//   }

//   const [updatedRowsCount] = await User.update(updateFields, {
//     where: { id },
//   });

//   if (updatedRowsCount === 0) {
//     throw new ErrorClass("Failed to update user details", 500);
//   }

//   const updatedUser = await User.findByPk(id);

//   return res.status(200).json({
//     status: true,
//     code: 200,
//     message: "User details updated successfully",
//     data: {
//       user: updatedUser,
//     },
//   });
// });

import { ErrorClass } from "../../utils/errorClass/index.js";
import { TryCatchFunction } from "../../utils/tryCatch/index.js";
import { User } from "../../models/auth/index.js";
import { loginFromAlpha } from "../../core/apiCalls.js";
import { AuthService } from "../../service/auth.service.js";
import { Config } from "../../config/config.js";

const authService = new AuthService();

// Pre-compile validation rules
const REQUIRED_LOGIN_FIELDS = ["email_address", "password"];
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
  const { email_address, password } = req.body;

  // Fast validation
  const missingFields = REQUIRED_LOGIN_FIELDS.filter((field) =>
    field === "email_address" ? !email_address : !password
  );

  if (missingFields.length > 0) {
    throw new ErrorClass(
      `Missing required fields: ${missingFields.join(", ")}`,
      422
    );
  }

  // Call external API first (keeping original flow)
  const data = await loginFromAlpha({ email_address, password });

  console.log(data);

  // if (data.status === false) {
  //   throw new ErrorClass("invalid password", 401);
  // }

  if (!data) {
    throw new ErrorClass("Service temporarily down", 500);
  }

  // Check existing user using the API response email (original approach)
  let existingUser = await User.findOne({
    where: { email: data.data.email }, // Keep original field reference
    attributes: ["id"], // Only fetch needed fields for performance
  });

  if (existingUser) {
    const token = await authService.signToken(
      existingUser.id,
      Config.JWT_SECRET,
      "1d"
    );

    return res.status(200).json({
      status: true,
      code: 200,
      message: "Login successful",
      data: {
        authToken: token,
      },
    });
  }

  // Create new user (keeping original field mapping)
  const user = await User.create({
    firstName: data.data.firstName,
    lastName: data.data.lastName,
    middleName: data.data.middleName,
    dob: data.data.dob,
    email: data.data.email, // Keep original - this was working
    billerId: data.data.billerId,
    nationality: data.data.nationality,
    occupation: data.data.occupation,
    gender: data.data.gender,
  });

  if (!user) {
    throw new ErrorClass(
      "Something went wrong while trying to create your account, kindly try again",
      500
    );
  }

  const token = await authService.signToken(user.id, Config.JWT_SECRET, "1d");

  return res.status(201).json({
    status: true,
    code: 201,
    message: "Account created and logged in successfully",
    data: {
      user,
      authToken: token,
    },
  });
});

export const updateUser = TryCatchFunction(async (req, res) => {
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

  // Single query optimization
  const existingUser = await User.findByPk(id, {
    attributes: ["id", "role"],
  });

  if (!existingUser) {
    throw new ErrorClass("User not found", 404);
  }

  // Fixed authorization check
  if (existingUser.role !== "admin" && existingUser.role !== "superadmin") {
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
