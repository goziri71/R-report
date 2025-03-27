import { ErrorClass } from "../../utils/errorClass/index.js";
import { TryCatchFunction } from "../../utils/tryCatch/index.js";
import { User } from "../../models/auth/index.js";
import { loginFromAlpha } from "../../core/apiCalls.js";
import { AuthService } from "../../service/auth.service.js";
import { Config } from "../../config/config.js";

const authService = new AuthService();

export const loginUser = TryCatchFunction(async (req, res) => {
  const { email_address, password } = req.body;
  const missingFields = [];
  if (!email_address) missingFields.push("email");
  if (!password) missingFields.push("password");

  if (missingFields.length > 0) {
    throw new ErrorClass(
      `Missing required fields: ${missingFields.join(", ")}`,
      400
    );
  }

  const data = await loginFromAlpha({ email_address, password });

  if (!data) throw new ErrorClass("Service temporally down", 500);

  const existingUser = await User.findOne({
    where: { email: data.data.email },
  });

  console.log(existingUser);

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
        user: existingUser,
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
    data: {
      user,
      authToken: token,
    },
  });
});
