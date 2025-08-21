import { Router } from "express";
import { createTask } from "../../controllers/task/index.js";
import { authorize } from "../../middleware/authorize.js";
const router = Router();

router.post("/create-task", authorize, createTask);

export default router;
