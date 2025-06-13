import express from "express";
import {
  createWeeklyReport,
  getAllDepertmentReport,
  editeWeeklyReport,
} from "../../controllers/weedlyReport/index.js";
import { authorize } from "../../middleware/authorize.js";

const router = express.Router();

router.post("/create-report", authorize, createWeeklyReport);
router.get("/getAll-weeklyReport", authorize, getAllDepertmentReport);
router.patch(
  "/editTarget-weeklyReport/:targetUser",
  authorize,
  editeWeeklyReport
);

export default router;
