import express from "express";
import {
  createWeeklyReport,
  getAllDepertmentReport,
} from "../../controllers/weedlyReport/index.js";
import { authorize } from "../../middleware/authorize.js";

const router = express.Router();

router.post("/create-report", authorize, createWeeklyReport);
router.get("/getAll-weeklyReport", authorize, getAllDepertmentReport);

export default router;
