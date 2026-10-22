import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// router.route('/register').post(registerUser)
//this is the same as the above line but we can chain it with get ,delete and all
router.post('/register', upload.fields([     //middleware for uploading files 
    {
        name: "avatar",
        maxCount: 1
    },
    {
        name: "coverImage",
        maxCount: 1
    }
]), registerUser)



export default router;