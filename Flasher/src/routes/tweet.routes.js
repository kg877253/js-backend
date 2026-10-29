import { Router } from 'express';
import {
    createTweet,
    deleteTweet,
    getUserTweets,
    updateTweet,
} from "../controllers/tweet.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"


const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.post("/", createTweet); //T-Done

router.get("/user/:userId", getUserTweets); //T-Done

router.patch("/:tweetId", updateTweet); //T-Done

router.delete("/:tweetId", deleteTweet); //T-Done

export default router