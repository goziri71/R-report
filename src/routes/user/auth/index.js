import express from "express";
const router = express.Router();
import { loginUser } from "../../../controllers/auth/index.js";

router.post("/login-user", loginUser);
export default router;
