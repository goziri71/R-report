import express from "express";
import {
  createWeeklyReport,
  getAllDepertmentReport,
  editeWeeklyReport,
  deleteWeeklyReport,
  saveDraft,
  submitDraft,
} from "../../controllers/weedlyReport/index.js";
import { authorize } from "../../middleware/authorize.js";

const router = express.Router();

router.post("/create-report", authorize, createWeeklyReport);
router.patch("/drafts/:reportId", authorize, saveDraft);
router.post("/drafts/:reportId/submit", authorize, submitDraft);
router.get("/getAll-weeklyReport", authorize, getAllDepertmentReport);
router.patch(
  "/editTarget-weeklyReport/:targetUser",
  authorize,
  editeWeeklyReport
);
router.delete(
  "/weekly-reports/:targetUser/:reportid",
  authorize,
  deleteWeeklyReport
);

export default router;
