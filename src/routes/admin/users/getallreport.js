import express from "express";
import {
  getAllReport,
  deleteIncident,
} from "../../../controllers/users/getallreport.js";
import { authorize } from "../../../middleware/authorize.js";

const router = express.Router();

router.get("/admin-get/all-report", authorize, getAllReport);
router.delete("/admin-delete/incidentReport/:id", authorize, deleteIncident);

export default router;
