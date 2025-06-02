import dotenv from "dotenv";
import axios from "axios";
dotenv.config();
import { TryCatchFunction } from "../../utils/tryCatch/index.js";
import { ErrorClass } from "../../utils/errorClass/index.js";
import { Incident } from "../../models/incedent/index.js";
import { User } from "../../models/auth/index.js";
import { Op } from "sequelize";
import storageClient from "../../supabase/index.js";
import multer from "multer";
import sharp from "sharp";
import { sanitizeInput } from "../../utils/sanitizedmessage/sanitizeMessage.js";
import nodemailer from "nodemailer";

const storageUrl = process.env.STORAGEURL;
if (!storageUrl) {
  throw new Error("STORAGEURL environment variable is not defined");
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
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
  const { message, subject } = req.body;
  const userId = req.user;
  console.log(userId);
  const file = req.file;
  if (!userId) {
    throw new ErrorClass("User must be logged in to report an incident", 401);
  }
  if (!message) {
    throw new ErrorClass("Empty message field", 400);
  }
  if (!subject) {
    throw new ErrorClass("Subject is required", 400);
  }

  const sanitizedMessage = sanitizeInput(message);
  const sanitizedSubject = sanitizeInput(subject);

  const user = await User.findByPk(userId);
  if (!user) {
    throw new ErrorClass("user not found", 404);
  }

  let incidentPhotoUrl = null;
  if (file) {
    const fileName = `incidents/${userId}/${Date.now()}-${file.originalname}`;
    const compressedImageBuffer = await sharp(file.buffer)
      .resize({
        width: 1200,
        height: 1200,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toBuffer();
    const { data, error } = await storageClient
      .from("redreport")
      .upload(fileName, compressedImageBuffer, {
        contentType: "image/jpeg",
        upsert: false,
      });
    if (error) {
      throw new ErrorClass(`File upload failed: ${error.message}`, 500);
    }
    incidentPhotoUrl = `${storageUrl}/object/public/redreport/${fileName}`;
  }

  const newIncident = await Incident.create({
    userId: userId,
    subject: sanitizedSubject,
    incidentphoto: incidentPhotoUrl,
    incidentMessage: sanitizedMessage,
  });

  const allUsers = await User.findAll({
    attributes: ["email", "firstName"],
    where: {
      email: {
        [Op.ne]: null,
      },
    },
  });

  const allEmails = allUsers
    .map((u) => u.email)
    .filter((email) => email && email.trim() !== "");

  if (allEmails.length === 0) {
    throw new ErrorClass("No valid email addresses found in database", 500);
  }

  try {
    for (const email of allEmails) {
      const emailPayload = {
        subject: `Incident Report: ${sanitizedSubject}`,
        recipient: {
          name: user.firstName || "User",
          email_address: email,
        },
        html: `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Incident Report</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; background-color: #f5f8fa;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f8fa; padding: 20px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.05); padding: 30px;">
              <tr>
                <td style="text-align: center; background: linear-gradient(135deg,rgb(245, 76, 82),rgb(191, 21, 21)); color: #fff; padding: 20px; border-radius: 6px 6px 0 0;">
                  <h1 style="margin: 0; font-size: 22px;">🚨 Incident Report</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px; color: #333;">
                  <p style="font-size: 16px; margin-bottom: 12px;"><strong>Subject:</strong> ${sanitizedSubject}</p>
                  <p style="font-size: 16px; margin-bottom: 20px;"><strong>Message:</strong><br>${sanitizedMessage.replace(
                    /\n/g,
                    "<br>"
                  )}</p>
                  ${
                    incidentPhotoUrl
                      ? `<p style="margin-bottom: 20px;"><a href="${incidentPhotoUrl}" target="_blank" style="background-color:rgb(245, 76, 76); color: #fff; padding: 10px 16px; text-decoration: none; border-radius: 4px; font-size: 14px;">📷 View attached photo</a></p>`
                      : ""
                  }
                  <p style="font-size: 14px; color: #666;">📅 Reported on: ${new Date().toLocaleString()}</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 15px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee;">
                  This is an automated report notification. Please do not reply.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
`,
      };

      await axios.post(
        "https://api.proxy.account.redbiller.com/api/v1/resources/email/send",
        // emailPayload
        "donna22@uctexasrealtybrokers.com"
      );
      console.log(`Email sent to ${email}`);
    }
  } catch (emailError) {
    console.error(
      "Failed to send one or more emails via external service:",
      emailError.message
    );
  }

  return res.status(201).json({
    status: true,
    code: 201,
    message: "Incident report submitted successfully",
    data: {
      incident: {
        id: newIncident.id,
        userId: newIncident.userId,
        subject: newIncident.subject,
        incidentphoto: newIncident.incidentphoto,
        incidentMessage: newIncident.incidentMessage,
        createdAt: newIncident.createdAt,
      },
    },
  });
});
