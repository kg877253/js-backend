import { Router } from 'express';
import {
    addComment,
    deleteComment,
    getVideoComments,
    updateComment,
} from "../controllers/comment.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

// router.route("/:videoId").get(getVideoComments).post(addComment);
router.get("/:videoId", getVideoComments); //T-Done
router.post("/:videoId", addComment); //T-Done

router.delete("/c/:commentId", deleteComment); //T-Done
router.patch("/c/:commentId", updateComment); //T-Done

export default router