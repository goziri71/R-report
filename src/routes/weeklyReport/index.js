import express from "express";
import { createWeeklyReport } from "../../controllers/weedlyReport/index.js";
import { authorize } from "../../middleware/authorize.js";

const router = express.Router();

router.post("/create-report", authorize, createWeeklyReport);

export default router;
