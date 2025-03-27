import dotenv from "dotenv";
dotenv.config();
import { TryCatchFunction } from "../../utils/tryCatch/index.js";
import { ErrorClass } from "../../utils/errorClass/index.js";
import { Incident } from "../../models/incedent/index.js";
import { User } from "../../models/auth/index.js";
import storageClient from "../../supabase/index.js";
import multer from "multer";
import { sanitizeInput } from "../../utils/sanitizedmessage/sanitizeMessage.js";

const storageUrl = process.env.STORAGEURL;
if (!storageUrl) {
  throw new Error("STORAGEURL environment variable is not defined");
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 30 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new ErrorClass("Only image files are allowed", 400), false);
    }
  },
});
export const uploadMiddleware = upload.single("photo");

export const sendAndUpdateReport = TryCatchFunction(async (req, res) => {
  const { message } = req.body;
  const userId = req.user;
  console.log(userId);
  const file = req.file;
  if (!userId) {
    throw new ErrorClass("User must be logged in to report an incident", 401);
  }
  if (!message) {
    throw new ErrorClass("Empty message field", 400);
  }
  const sanitizedMessage = sanitizeInput(message);
  const user = await User.findByPk(userId);
  if (!user) {
    throw new ErrorClass("user not found", 404);
  }
  let incidentPhotoUrl = null;
  if (file) {
    const fileName = `incidents/${userId}/${Date.now()}-${file.originalname}`;
    const { data, error } = await storageClient
      .from("redreport")
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });
    if (error) {
      throw new ErrorClass(`File upload failed: ${error.message}`, 500);
    }
    incidentPhotoUrl = `${storageUrl}/object/public/redreport/${fileName}`;
  }

  const newIncident = await Incident.create({
    userId: userId,
    incidentphoto: incidentPhotoUrl,
    incidentMessage: sanitizedMessage,
  });

  return res.status(201).json({
    status: true,
    code: 201,
    message: "Incident report submitted successfully",
    data: {
      incident: {
        id: newIncident.id,
        userId: newIncident.userId,
        incidentphoto: newIncident.incidentphoto,
        incidentMessage: newIncident.incidentMessage,
      },
    },
  });
});
