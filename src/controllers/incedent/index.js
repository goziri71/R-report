import dotenv from "dotenv";
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

const transporter = nodemailer.createTransport({
  service: "gmail", // Use service instead of manual host/port
  auth: {
    user: process.env.SMTP_USER, // your gmail address
    pass: process.env.SMTP_PASS, // Use App Password, not regular password
  },
  // Add these settings for Gmail
  pool: true,
  maxConnections: 1,
  rateDelta: 20000, // 20 seconds between emails
  rateLimit: 3, // max 3 emails per rateDelta
});

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

  console.log(allUsers);

  const allEmails = allUsers
    .map((u) => u.email)
    .filter((email) => email && email.trim() !== "");

  if (allEmails.length === 0) {
    throw new ErrorClass("No valid email addresses found in database", 500);
  }

  //   const mailOptions = {
  //     from: `"${user.firstName} via Incident System" <${process.env.SMTP_USER}>`, // More personal sender
  //     replyTo: user.email, // Reply goes to reporter, not system email
  //     bcc: batch.join(", "),
  //     subject: `Incident Report: ${sanitizedSubject}`, // Remove emoji, keep simple
  //     html: `
  //     <div style="font-family: Arial, sans-serif; max-width: 600px;">
  //       <h3>Incident Report Notification</h3>

  //       <p>Hello,</p>

  //       <p>A new incident has been reported by <strong>${
  //         user.firstName || "User"
  //       }</strong> (${user.email}):</p>

  //       <div style="border-left: 4px solid #d73527; padding-left: 15px; margin: 20px 0;">
  //         <h4>${sanitizedSubject}</h4>
  //         <p>${sanitizedMessage.replace(/\n/g, "<br>")}</p>
  //         ${
  //           incidentPhotoUrl
  //             ? `<p><a href="${incidentPhotoUrl}" target="_blank">View attached photo</a></p>`
  //             : ""
  //         }
  //       </div>

  //       <p><small>Reported on: ${new Date().toLocaleString()}</small></p>

  //       <hr style="margin: 20px 0;">
  //       <p style="font-size: 12px; color: #666;">
  //         This notification was sent automatically. Please do not reply to this email.
  //       </p>
  //     </div>
  //   `,
  //     text: `
  // Incident Report Notification

  // A new incident has been reported by ${user.firstName || "User"} (${user.email}):

  // Subject: ${sanitizedSubject}
  // Message: ${sanitizedMessage}
  // ${incidentPhotoUrl ? `Photo: ${incidentPhotoUrl}` : ""}

  // Reported on: ${new Date().toLocaleString()}

  // This notification was sent automatically.
  //   `,
  //   };

  const mailOptions = {
    from: `"${user.firstName} via Incident System" <${process.env.SMTP_USER}>`,
    replyTo: user.email,
    bcc: allEmails.join(", "),
    subject: `Incident Report: ${sanitizedSubject}`,
    headers: {
      "X-Priority": "3",
      "X-MSMail-Priority": "Normal",
      "Message-ID": `<${Date.now()}.${Math.random().toString(
        36
      )}@incident-system>`,
      "List-Unsubscribe": `<mailto:${process.env.SMTP_USER}?subject=Unsubscribe>`,
    },
    html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Incident Report Notification</title>
          </head>
          <body style="margin: 0; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 600;">Incident Report Notification</h1>
              </div>
              
              <div style="padding: 30px;">
                <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                  Hello,
                </p>
                
                <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                  A new incident has been reported by <strong>${
                    user.firstName || "User"
                  }</strong> (${user.email}):
                </p>
                
                <div style="background-color: #f8f9fa; border-left: 4px solid #dc3545; padding: 20px; margin: 25px 0; border-radius: 0 6px 6px 0;">
                  <h3 style="color: #dc3545; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                    ${sanitizedSubject}
                  </h3>
                  
                  <div style="background-color: white; padding: 15px; border-radius: 4px; margin: 15px 0;">
                    <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0; white-space: pre-wrap;">
                      ${sanitizedMessage.replace(/\n/g, "<br>")}
                    </p>
                  </div>
                  
                  ${
                    incidentPhotoUrl
                      ? `<div style="margin-top: 15px;">
                      <a href="${incidentPhotoUrl}" target="_blank" style="display: inline-block; background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; font-size: 14px;">
                        📷 View attached photo
                      </a>
                    </div>`
                      : ""
                  }
                </div>
                
                <div style="background-color: #e9ecef; padding: 12px; border-radius: 4px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 14px; color: #6c757d;">
                    <strong>Reported:</strong> ${new Date().toLocaleString(
                      "en-US",
                      {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                </div>
                
                <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 25px;">
                  Please take appropriate action as needed.
                </p>
              </div>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; border-top: 1px solid #dee2e6;">
                <p style="margin: 0; font-size: 12px; color: #6c757d; text-align: center; line-height: 1.4;">
                  This notification was sent automatically. Please do not reply to this email.<br>
                  For questions, contact: ${user.email}
                </p>
              </div>
              
            </div>
          </body>
          </html>
        `,
    text: `
Incident Report Notification

A new incident has been reported by ${user.firstName || "User"} (${user.email}):

Subject: ${sanitizedSubject}
Message: ${sanitizedMessage}
${incidentPhotoUrl ? `Photo: ${incidentPhotoUrl}` : ""}

Reported on: ${new Date().toLocaleString()}

This notification was sent automatically.
        `.trim(),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(
      `Incident report notification sent to ${allEmails.length} users`
    );
  } catch (emailError) {
    console.error("Failed to send email notifications:", emailError);
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
