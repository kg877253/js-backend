import { Router } from "express";
import { registerUser } from "../controllers/user.controller";

const router = Router();

// router.post('/register', registerUser)
//this is the same as the above line but we can chain it with get ,delete and all
router.route('/register').post(registerUser)

export default router;