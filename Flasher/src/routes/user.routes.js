import { Router } from "express";
import { registerUser, loginUser , logoutUser , refreshAccessToken } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

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

router.post('/login', loginUser);

//secured routes
router.post('/logout',verifyJWT, logoutUser);
router.post('/refresh-token', refreshAccessToken);

export default router;