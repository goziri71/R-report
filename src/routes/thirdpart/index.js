import { Router } from "express";
const router = Router();
import { ThirdPartyendpoint } from "../../controllers/thirdParty/index.js";

router.post("/test/login-pupil", ThirdPartyendpoint);

export default router;
