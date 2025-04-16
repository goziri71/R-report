import express from "express";
import {
  sendAndUpdateReport,
  uploadMiddleware,
} from "../../../controllers/incedent/index.js";
import { authorize } from "../../../middleware/authorize.js";
import { getCurrentUser } from "../../../controllers/auth/sessionAuth.js";
const router = express.Router();

router.post("/user/report", authorize, uploadMiddleware, sendAndUpdateReport);

router.get("/current/user", authorize, getCurrentUser);
export default router;
