import express from "express";
import {
  sendAndUpdateReport,
  uploadMiddleware,
} from "../../../controllers/incedent/index.js";
import { authorize } from "../../../middleware/authorize.js";
const router = express.Router();

router.post("/user/report", authorize, uploadMiddleware, sendAndUpdateReport);
export default router;
