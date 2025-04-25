import { TryCatchFunction } from "../../utils/tryCatch/index.js";
import { ErrorClass } from "../../utils/errorClass/index.js";
import { Incident } from "../../models/incedent/index.js";
import { User } from "../../models/auth/index.js";

// export const getAllReport = TryCatchFunction(async (req, res) => {
//   console.log(req.user);
//   const incidents = await Incident.findAll({
//     include: [
//       {
//         model: User,
//         attributes: [
//           "id",
//           "firstName",
//           "lastName",
//           "middleName",
//           "dob",
//           "nationality",
//           "occupation",
//           "gender",
//           "createdAt",
//           "updatedAt",
//           "email",
//         ],
//       },
//     ],
//     order: [["createdAt", "DESC"]],
//   });

//   console.log(req.user.role);

//   if (!incidents || incidents.length === 0) {
//     throw new ErrorClass("Not found", 404);
//   } else {
//     return res.status(200).json({
//       status: true,
//       code: 200,
//       message: "Incident reports retrieved successfully",
//       data: {
//         incidents,
//       },
//     });
//   }
// });

export const getAllReport = TryCatchFunction(async (req, res) => {
  const requestedRole = req.query.role || "user";
  const currentUser = await User.findByPk(req.user);

  console.log(currentUser);

  if (!currentUser) {
    throw new ErrorClass("User not found", 404);
  }
  const isAdmin = currentUser.role === "admin";
  console.log(isAdmin);
  if (requestedRole === "admin" && !isAdmin) {
    return res.status(403).json({
      status: false,
      code: 403,
      message: "Access denied: Insufficient permissions",
    });
  }

  if (isAdmin) {
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
      throw new ErrorClass("No incidents found", 404);
    }

    return res.status(200).json({
      status: true,
      code: 200,
      message: "All incident reports retrieved successfully",
      data: {
        incidents,
      },
    });
  } else {
    const incidents = await Incident.findAll({
      where: {
        userId: req.user,
      },
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
          where: {
            id: req.user,
          },
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    if (!incidents || incidents.length === 0) {
      throw new ErrorClass("No incidents found for this user", 404);
    }

    return res.status(200).json({
      status: true,
      code: 200,
      message: "Your incident reports retrieved successfully",
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
