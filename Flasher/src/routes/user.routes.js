import { Router } from "express";
import {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getcurrentuser,
    updateaccountdetails,
    updateuseravatar,
    updateusercoverimage,
    getUserChannelProfile,
    getWatchHistory
} from "../controllers/user.controller.js";
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
]), registerUser) //T-Done
router.post('/login', loginUser);//T-Done

//secured routes
router.post('/logout', verifyJWT, logoutUser); //T-Done
router.post('/refresh-token', refreshAccessToken); //T-Done
router.post('/change-password', verifyJWT, changeCurrentPassword); //T-Done

router.get('/current-user', verifyJWT, getcurrentuser);//T-Done
router.get('/channel/:username', verifyJWT, getUserChannelProfile); //T-Done (username-kartik)
router.get('/watch-history', verifyJWT, getWatchHistory); //T-Done 

router.patch('/update-account-details', verifyJWT, updateaccountdetails); //T-Done
router.patch('/update-avatar', verifyJWT, upload.single('avatar'), updateuseravatar);
router.patch('/update-cover-image', verifyJWT, upload.single('coverImage'), updateusercoverimage);

export default router;