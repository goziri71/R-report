import { TryCatchFunction } from "../../utils/tryCatch/index.js";
import { ErrorClass } from "../../utils/errorClass/index.js";
import { Incident } from "../../models/incedent/index.js";
import { User } from "../../models/auth/index.js";
// import { AuthService } from "../../service/auth.service.js";
// import { Config } from "../../config/config.js";

// const authservice = new AuthService();

export const getAllReport = TryCatchFunction(async (req, res) => {
  console.log(req.user);
  const incidents = await Incident.findAll({
    include: [
      {
        model: User,
        attributes: [
          "id",
          "firstName",
          "lastName",
          "middleName",
          "dob",
          "nationality",
          "occupation",
          "gender",
          "createdAt",
          "updatedAt",
          "email",
        ],
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  if (!incidents || incidents.length === 0) {
    throw new ErrorClass("Not found", 404);
  } else {
    return res.status(200).json({
      status: true,
      code: 200,
      message: "Incident reports retrieved successfully",
      data: {
        incidents,
      },
    });
  }
});

export const deleteIncident = TryCatchFunction(async (req, res) => {
  const { id } = req.params;
  if (!id) {
    throw new ErrorClass("Incident ID is required", 400);
  }
  const incident = await Incident.findByPk(id);
  if (!incident) {
    throw new ErrorClass("Incident report not found or has been deleted", 404);
  }
  await incident.destroy();

  return res.status(200).json({
    status: true,
    code: 200,
    message: "incident has been deleted successfully",
  });
});
