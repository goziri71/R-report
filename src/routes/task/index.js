import { Router } from "express";
import {
  createTask,
  editeTask,
  getTasks,
  deleteTask,
} from "../../controllers/task/index.js";
import { authorize } from "../../middleware/authorize.js";
const router = Router();

router.post("/create-task", authorize, createTask);
router.get("/get-tasks", authorize, getTasks);
router.patch("/edit-task/:id", authorize, editeTask);
router.delete("/delete-task/:id", authorize, deleteTask);

export default router;
