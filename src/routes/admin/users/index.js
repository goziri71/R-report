import express from "express";
import {
  getAllUsers,
  deleteUser,
  userStatus,
  getSingleUserDetails,
} from "../../../controllers/users/index.js";
import { authorize } from "../../../middleware/authorize.js";

const router = express.Router();

router.get("/users", authorize, getAllUsers);
router.delete("/admin/user-delete/:id", authorize, deleteUser);
router.patch(
  "/admin/user-accountStat/:userId/:userStat",
  authorize,
  userStatus
);
router.get("/single-user/details/:id", authorize, getSingleUserDetails);

export default router;
