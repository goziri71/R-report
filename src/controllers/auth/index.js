import { ErrorClass } from "../../utils/errorClass/index.js";
import { TryCatchFunction } from "../../utils/tryCatch/index.js";
import { User } from "../../models/auth/index.js";
import { loginFromAlpha } from "../../core/apiCalls.js";
import { AuthService } from "../../service/auth.service.js";
import { Config } from "../../config/config.js";

const authService = new AuthService();

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
//     const needsUpdate =
//       existingUser.firstName !== data.data.firstName ||
//       existingUser.lastName !== data.data.lastName ||
//       existingUser.middleName !== data.data.middleName ||
//       existingUser.dob !== data.data.dob ||
//       existingUser.nationality !== data.data.nationality ||
//       existingUser.occupation !== data.data.occupation ||
//       existingUser.gender !== data.data.gender ||
//       existingUser.billerId !== data.data.billerId;
//     if (!needsUpdate) {
//       const token = await authService.signToken(
//         existingUser.id,
//         Config.JWT_SECRET,
//         "1d"
//       );

//       return res.status(200).json({
//         status: true,
//         code: 200,
//         message: "Login successful",
//         data: {
//           // user: existingUser,
//           authToken: token,
//         },
//       });
//     }

//     await User.update(
//       {
//         firstName: data.data.firstName,
//         lastName: data.data.lastName,
//         middleName: data.data.middleName,
//         dob: data.data.dob,
//         nationality: data.data.nationality,
//         occupation: data.data.occupation,
//         gender: data.data.gender,
//         billerId: data.data.billerId,
//       },
//       {
//         where: { id: existingUser.id },
//       }
//     );
//     existingUser = await User.findOne({
//       where: { email: data?.data.email },
//     });

//     const token = await authService.signToken(
//       existingUser.id,
//       Config.JWT_SECRET,
//       "1d"
//     );
//     return res.status(200).json({
//       status: true,
//       code: 200,
//       message: "User details updated and logged in successfully",
//       data: {
//         user: existingUser,
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

export const loginUser = TryCatchFunction(async (req, res) => {
  const { email_address, password } = req.body;
  const missingFields = [];
  if (!email_address) missingFields.push("email");
  if (!password) missingFields.push("password");
  if (missingFields.length > 0) {
    throw new ErrorClass(
      `Missing required fields: ${missingFields.join(", ")}`,
      422
    );
  }
  const data = await loginFromAlpha({ email_address, password });

  if (data.status === false) {
    throw new ErrorClass("invalid password", 401);
  }

  if (!data) throw new ErrorClass("Service temporarily down", 500);
  let existingUser = await User.findOne({
    where: { email: data.data.email },
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
        // user: existingUser,
        authToken: token,
      },
    });
  }

  const user = await User.create({
    firstName: data.data.firstName,
    lastName: data.data.lastName,
    middleName: data.data.middleName,
    dob: data.data.dob,
    email: data.data.email,
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
