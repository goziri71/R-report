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

export const depertmentalEvent = TryCatchFunction(async (req, res) => {
  const userID = req.user;
  const { eventTitle, eventDescription, eventDate, eventTime } = req.body;
  let eventField = [];
  if (!eventTitle) eventField.push("Title");
  if (!eventDescription) eventField.push("Event Description");
  if (!eventDate) eventField.push("Event Date");
  if (!eventTime) eventField.push("Event Time");
  if (eventField.length > 0) {
    throw new ErrorClass(`${eventField.join(", ")} is required`, 400);
  }
  if (!userID) {
    throw new ErrorClass("no user Id found", 404);
  }

  const user = await User.findByPk(userID);
  if (!user) {
    throw new ErrorClass("No user found", 404);
  }
  if (user.role !== "admin") {
    throw new ErrorClass("Only team leads can make depertmental events", 403);
  }
  const eventDateTime = new Date(`${eventDate}T${eventTime}`);

  if (eventDateTime <= new Date()) {
    throw new ErrorClass("Event date and time must be in the future", 400);
  }

  const departmentalEvent = await Event.create({
    title: eventTitle,
    description: eventDescription,
    dateTime: eventDateTime,
    createdBy: userID,
    eventType: "departmental",
  });

  res.status(201).json({
    code: 201,
    status: true,
    message: "Departmental event created successfully",
    event: {
      id: departmentalEvent.id,
      title: departmentalEvent.title,
      description: departmentalEvent.description,
      dateTime: departmentalEvent.dateTime,
    },
  });
});

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

export const updateEvent = TryCatchFunction(async (req, res) => {
  const { id } = req.params;
  const { eventTitle, eventDescription, eventDate, eventTime } = req.body;
  const userID = req.user;

  if (!userID) {
    throw new ErrorClass("Unathorized user", 401);
  }

  const user = await User.findByPk(userID);
  if (!user) {
    throw new ErrorClass("User not found", 404);
  }
  if (user.role !== "admin") {
    throw new ErrorClass("Only admins can update events", 403);
  }

  const event = await events.findByPk(id);
  if (!event) {
    throw new ErrorClass("Event not found", 404);
  }

  const updateData = {};
  if (eventTitle !== undefined) {
    updateData.eventTitle = eventTitle.trim();
  }
  if (eventDescription !== undefined) {
    updateData.eventDescription = eventDescription.trim();
  }

  if (eventDate !== undefined) {
    const dateValue = parseInt(eventDate, 10);
    if (isNaN(dateValue) || eventDate.length !== 8) {
      throw new ErrorClass(
        "Event Date must be in MMDDYYYY format (e.g., '05152025' for May 15, 2025)",
        400
      );
    }
    updateData.eventDate = dateValue;
  }

  if (eventTime !== undefined) {
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
    updateData.eventTime = formattedTime;
  }

  if (Object.keys(updateData).length === 0) {
    throw new ErrorClass("No valid fields provided for update", 400);
  }

  await event.update(updateData);

  const updatedEvent = await events.findByPk(id);
  const formattedEvent = formatEventDate(updatedEvent);

  return res.status(200).json({
    code: 200,
    status: "success",
    message: "Event updated successfully",
    data: formattedEvent,
  });
});

export const deleteEvent = TryCatchFunction(async (req, res) => {
  const { id } = req.params;
  const userID = req.user;

  if (!userID) {
    throw new ErrorClass("User is required", 401);
  }
  if (!id) {
    throw new ErrorClass("Id required to delete event", 400);
  }
  const currentUser = await User.findByPk(userID);
  if (!currentUser) {
    throw new ErrorClass("User not found", 404);
  }
  if (currentUser.role !== "admin") {
    throw new ErrorClass(
      "Unathorized, must be an admin to delete an event",
      403
    );
  }
  const event = await events.findByPk(id);
  if (!event) {
    throw new ErrorClass("Event not found", 404);
  }

  await event.destroy({ where: { id } });

  res.status(200).json({
    code: 200,
    status: true,
    message: "event has been deleted successfully",
  });
});
