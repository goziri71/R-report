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

const storageUrl = process.env.STORAGEURL;
if (!storageUrl) {
  throw new Error("STORAGEURL environment variable is not defined");
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const isImage = file.mimetype.startsWith("image/");
    const isAudio = file.mimetype.startsWith("audio/");
    const imageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"];
    const audioExtensions = [
      ".mp3",
      ".wav",
      ".m4a",
      ".aac",
      ".ogg",
      ".flac",
      ".opus",
      ".webm",
    ];

    const fileExtension = file.originalname
      .toLowerCase()
      .substring(file.originalname.lastIndexOf("."));
    const hasValidImageExt = imageExtensions.includes(fileExtension);
    const hasValidAudioExt = audioExtensions.includes(fileExtension);

    if (isImage || hasValidImageExt || isAudio || hasValidAudioExt) {
      cb(null, true);
    } else {
      cb(
        new ErrorClass(
          "Only image files (JPEG, PNG, WebP, GIF, BMP) and audio files (MP3, WAV, M4A, AAC, OGG, FLAC, OPUS, WebM) are allowed",
          400
        ),
        false
      );
    }
  },
});

export const uploadMiddleware = upload.fields([
  { name: "photo", maxCount: 1 },
  { name: "voiceNote", maxCount: 1 },
]);

const sanitizeFileName = (fileName) => {
  return fileName
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase();
};

const uploadFile = async (file, userId, type) => {
  try {
    const isImage = file.mimetype.startsWith("image/");
    const folder = isImage ? "incidents" : "incidents/voice";
    const sanitizedOriginalName = sanitizeFileName(file.originalname);
    const fileName = `${folder}/${userId}/${Date.now()}-${sanitizedOriginalName}`;

    let fileBuffer = file.buffer;
    let contentType = file.mimetype;

    // Compress images
    if (isImage) {
      fileBuffer = await sharp(file.buffer)
        .resize({
          width: 1200,
          height: 1200,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toBuffer();
      contentType = "image/jpeg";
    }

    console.log(`Uploading ${type} to path: ${fileName}`);

    const { data, error } = await storageClient
      .from("redreport")
      .upload(fileName, fileBuffer, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error(`File upload error:`, error);
      throw new ErrorClass(`${type} upload failed: ${error.message}`, 500);
    }

    console.log(`Upload successful for ${type}:`, data);
    const { data: urlData } = storageClient
      .from("redreport")
      .getPublicUrl(fileName);

    console.log(`Generated public URL for ${type}:`, urlData.publicUrl);

    try {
      const response = await fetch(urlData.publicUrl, {
        method: "HEAD",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; IncidentReporter/1.0)",
        },
      });
      console.log(
        `File accessibility check for ${type}: ${response.status} ${response.statusText}`
      );

      if (!response.ok) {
        console.warn(
          `File may not be publicly accessible: ${response.status} ${response.statusText}`
        );
        console.warn(
          "Response headers:",
          Object.fromEntries(response.headers.entries())
        );
      }
    } catch (checkError) {
      console.warn(`Could not verify file accessibility:`, checkError.message);
    }

    return urlData.publicUrl;
  } catch (error) {
    console.error(`Upload error for ${type}:`, error);
    throw new ErrorClass(`Failed to upload ${type}: ${error.message}`, 500);
  }
};

const escapeHtml = (text) => {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

const sendNotificationEmails = async (
  incident,
  reportingUser,
  incidentPhotoUrl,
  voiceNoteUrl
) => {
  try {
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
      console.warn("No valid email addresses found in database");
      return;
    }

    // Log the URLs being used in emails for debugging
    console.log("Email URLs - Photo:", incidentPhotoUrl);
    console.log("Email URLs - Voice Note:", voiceNoteUrl);

    // Create base email template - KEEPING ORIGINAL TEMPLATE EXACTLY
    const createEmailPayload = (email) => ({
      subject: `Incident Report: ${incident.subject}`,
      recipient: {
        name: reportingUser.firstName || "User",
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
                <p style="font-size: 16px; margin-bottom: 12px;"><strong>Reported by:</strong> ${escapeHtml(
                  reportingUser.firstName || "Unknown User"
                )}</p>
                <p style="font-size: 16px; margin-bottom: 12px;"><strong>Subject:</strong> ${escapeHtml(
                  incident.subject
                )}</p>
                <p style="font-size: 16px; margin-bottom: 20px;"><strong>Message:</strong><br>${escapeHtml(
                  incident.incidentMessage
                ).replace(/\n/g, "<br>")}</p>
                ${
                  incidentPhotoUrl
                    ? `<p style="margin-bottom: 15px;"><a href="${incidentPhotoUrl}" target="_blank" style="background-color:rgb(245, 76, 76); color: #fff; padding: 10px 16px; text-decoration: none; border-radius: 4px; font-size: 14px; display: inline-block;">📷 View attached photo</a></p>`
                    : ""
                }
                ${
                  voiceNoteUrl
                    ? `<p style="margin-bottom: 20px;"><a href="${voiceNoteUrl}" target="_blank" style="background-color:rgb(21, 121, 191); color: #fff; padding: 10px 16px; text-decoration: none; border-radius: 4px; font-size: 14px; display: inline-block;">🎵 Listen to voice note</a></p>`
                    : ""
                }
                <p style="font-size: 14px; color: #666;">📅 Reported on: ${new Date(
                  incident.createdAt
                ).toLocaleString()}</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 15px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee;">
                This is an automated report notification. Please do not reply to this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`,
    });

    // Send emails concurrently with individual error handling
    const emailPromises = allEmails.map(async (email) => {
      try {
        const emailPayload = createEmailPayload(email);
        await axios.post(
          "https://api.proxy.account.redbiller.com/api/v1/resources/email/send",
          emailPayload,
          {
            timeout: 10000, // 10 second timeout
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        console.log(`Email sent successfully to ${email}`);
        return { email, status: "success" };
      } catch (error) {
        console.error(`Failed to send email to ${email}:`, error.message);
        return { email, status: "failed", error: error.message };
      }
    });

    // Wait for all emails to complete (but don't fail if some fail)
    const results = await Promise.allSettled(emailPromises);
    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value.status === "success"
    ).length;
    const failed = results.length - successful;

    console.log(
      `Email notification summary: ${successful} sent, ${failed} failed`
    );
  } catch (error) {
    console.error(
      "Critical error in email notification system:",
      error.message
    );
    // Don't throw - we don't want email failures to break incident creation
  }
};

export const sendAndUpdateReport = TryCatchFunction(async (req, res) => {
  const { message, subject } = req.body;
  const userId = req.user;
  const photoFile = req.files?.photo?.[0];
  const voiceNoteFile = req.files?.voiceNote?.[0];

  // Input validation
  if (!userId) {
    throw new ErrorClass("User must be logged in to report an incident", 401);
  }
  if (!message?.trim()) {
    throw new ErrorClass("Message is required and cannot be empty", 400);
  }
  if (!subject?.trim()) {
    throw new ErrorClass("Subject is required and cannot be empty", 400);
  }

  // Sanitize inputs
  const sanitizedMessage = sanitizeInput(message.trim());
  const sanitizedSubject = sanitizeInput(subject.trim());

  // Verify user exists
  const user = await User.findByPk(userId);
  if (!user) {
    throw new ErrorClass("User not found", 404);
  }

  // Upload files concurrently for better performance
  const [incidentPhotoUrl, voiceNoteUrl] = await Promise.all([
    photoFile ? uploadFile(photoFile, userId, "photo") : Promise.resolve(null),
    voiceNoteFile
      ? uploadFile(voiceNoteFile, userId, "voice note")
      : Promise.resolve(null),
  ]);

  // Create incident record
  const newIncident = await Incident.create({
    userId: userId,
    subject: sanitizedSubject,
    incidentphoto: incidentPhotoUrl,
    voiceNote: voiceNoteUrl,
    incidentMessage: sanitizedMessage,
  });

  // Send notification emails in background (don't await)
  sendNotificationEmails(
    newIncident,
    user,
    incidentPhotoUrl,
    voiceNoteUrl
  ).catch((error) => {
    console.error("Background email notification failed:", error.message);
  });

  // Return success response immediately
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
        voiceNote: newIncident.voiceNote,
        incidentMessage: newIncident.incidentMessage,
        createdAt: newIncident.createdAt,
      },
    },
  });
});
