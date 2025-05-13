import express from "express";
import { sendEvent, getAllevent } from "../../../controllers/events/index.js";
import { authorize } from "../../../middleware/authorize.js";

const router = express.Router();

router.post("/create-event", authorize, sendEvent);
router.get("/get-all/event", authorize, getAllevent);

export default router;
