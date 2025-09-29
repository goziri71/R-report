import express from "express";
const router = express.Router();
import {
  loginUser,
  updateUser,
  addNewUser,
} from "../../../controllers/auth/index.js";
import { getCurrentUser } from "../../../controllers/auth/sessionAuth.js";
import { authorize } from "../../../middleware/authorize.js";

router.post("/login-user", loginUser);
router.patch("/update-userdetails-admin/:id", authorize, updateUser);
router.post("/add-new-user", authorize, addNewUser);

router.get("/current-user", authorize, getCurrentUser);

export default router;
