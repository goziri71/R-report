import express from "express";
import {
  sendEvent,
  getAllevent,
  updateEvent,
  deleteEvent,
} from "../../../controllers/events/index.js";
import { authorize } from "../../../middleware/authorize.js";

const router = express.Router();

router.post("/create-event", authorize, sendEvent);
router.get("/get-all/event", authorize, getAllevent);
router.patch("/update-event/:id", authorize, updateEvent);
router.delete("/delete-event/:id", authorize, deleteEvent);

export default router;
