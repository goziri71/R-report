import { TryCatchFunction } from "../../utils/tryCatch/index.js";
import { ErrorClass } from "../../utils/errorClass/index.js";
import { User } from "../../models/auth/index.js";
import { events } from "../../models/events/index.js";

const formatEventDate = (event) => {
  if (!event || !event.eventDate) return event;

  const formatted = { ...event.get({ plain: true }) };
  const dateStr = formatted.eventDate.toString();
  if (dateStr.length === 8) {
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const year = dateStr.substring(0, 4);

    const date = new Date(month - 1, day, year);
    if (isNaN(date.getTime())) {
      formatted.formattedDate = "Invalid Date";
    } else {
      formatted.formattedDate = date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
  }
  return formatted;
};

export const sendEvent = TryCatchFunction(async (req, res) => {
  const { eventTitle, eventDescription, eventDate, eventTime } = req.body;
  let eventField = [];
  if (!eventTitle) eventField.push("Title");
  if (!eventDescription) eventField.push("Event Description");
  if (!eventDate) eventField.push("Event Date");
  if (!eventTime) eventField.push("Event Time");
  if (eventField.length > 0) {
    throw new ErrorClass(`${eventField.join(", ")} is required`, 400);
  }

  const dateValue = parseInt(eventDate, 10);
  if (isNaN(dateValue) || eventDate.length !== 8) {
    throw new ErrorClass(
      "Event Date must be in MMDDYYYY format (e.g., '05152025' for May 15, 2025)",
      400
    );
  }

  const timeFormatRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s*(am|pm|AM|PM)$/i;
  if (!timeFormatRegex.test(eventTime)) {
    throw new ErrorClass(
      "Event Time must be in format 'HH:MM AM/PM' (e.g., '9:00 AM' or '2:30 PM')",
      400
    );
  }

  const formattedTime = eventTime.replace(/\s*(am|pm)\s*$/i, (match) => {
    return " " + match.trim().toUpperCase();
  });

  const user = await User.findByPk(req.user);
  if (!user) {
    throw new ErrorClass("User not found", 404);
  }
  if (user.role !== "admin") {
    throw new ErrorClass("Only admins can post events", 403);
  }

  const newEvent = await events.create({
    userId: req.user,
    eventTitle: eventTitle.trim(),
    eventDescription: eventDescription.trim(),
    eventDate: dateValue,
    eventTime: formattedTime,
  });

  const formattedEvent = formatEventDate(newEvent);
  return res.status(201).json({
    code: 201,
    status: "successful",
    data: formattedEvent,
  });
});

// export const getAllevent = TryCatchFunction(async (req, res) => {
//   console.log(req);
//   const { page = 1, limit = 10, sort = "desc" } = req.query;
//   const offset = (page - 1) * limit;

//   const userID = req.user;
//   if (!userID) {
//     throw new ErrorClass("Unauthorized User", 401);
//   }

//   const user = await User.findByPk(userID);
//   if (!user) {
//     throw new ErrorClass("User not found", 404);
//   }

//   const { count, rows } = await events.findAndCountAll({
//     order: [["createdAt", sort.toUpperCase() === "ASC" ? "ASC" : "DESC"]],
//     limit: parseInt(limit, 10),
//     offset: parseInt(offset, 10),
//   });

//   const formattedEvents = rows.map((event) => formatEventDate(event));

//   return res.status(200).json({
//     code: 200,
//     status: "success",
//     data: formattedEvents,
//     totalCount: count,
//     currentPage: parseInt(page, 10),
//     totalPages: Math.ceil(count / limit),
//   });
// });

export const getAllevent = TryCatchFunction(async (req, res) => {
  const { page = 1, limit = 10, sort = "desc" } = req.query;
  const offset = (page - 1) * limit;

  const userID = req.user;
  if (!userID) {
    throw new ErrorClass("Unauthorized User", 401);
  }
  const user = await User.findByPk(userID);
  if (!user) {
    throw new ErrorClass("User not found", 404);
  }
  const parsedLimit = Math.min(parseInt(limit, 10), 100);
  const { count, rows } = await events.findAndCountAll({
    order: [["createdAt", sort.toUpperCase() === "ASC" ? "ASC" : "DESC"]],
    limit: parsedLimit,
    offset: parseInt(offset, 10),
  });
  const formattedEvents = rows.map((event) => formatEventDate(event));
  return res.status(200).json({
    code: 200,
    status: "success",
    data: formattedEvents,
    totalCount: count,
    currentPage: parseInt(page, 10),
    totalPages: Math.ceil(count / parsedLimit),
    limit: parsedLimit,
  });
});
