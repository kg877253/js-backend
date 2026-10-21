import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";

const router = Router();

router.route('/register').post(registerUser)
//this is the same as the above line but we can chain it with get ,delete and all
router.post('/register', registerUser)

export default router;