import { ErrorClass } from "../../utils/errorClass/index.js";
import { TryCatchFunction } from "../../utils/tryCatch/index.js";
import { User } from "../../models/auth/index.js";

export const getCurrentUser = TryCatchFunction(async (req, res) => {
  const userId = req.user;
  const user = await User.findOne({ where: { id: userId } });
  if (!user) throw new ErrorClass("Unauthorised", 401);

  return res.status(200).json({
    status: true,
    code: 200,
    message: "Authorised user",
    data: {
      user,
    },
  });
});
