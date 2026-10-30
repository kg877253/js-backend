import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { Video } from "../models/video.model.js"
import { Comment } from "../models/comment.model.js"
import { Tweet } from "../models/tweet.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    const alreadyLiked = await Like.findOne({ video: videoId, likedBy: req.user._id })

    // pehle se like hai -> unlike
    if (alreadyLiked) {
        await Like.findByIdAndDelete(alreadyLiked._id)
        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: false }, "Video unliked successfully"))
    }

    // like nahi hai -> like karo
    await Like.create({ video: videoId, likedBy: req.user._id })
    return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: true }, "Video liked successfully"))
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id")
    }

    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    const alreadyLiked = await Like.findOne({ comment: commentId, likedBy: req.user._id })

    if (alreadyLiked) {
        await Like.findByIdAndDelete(alreadyLiked._id)
        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: false }, "Comment unliked successfully"))
    }

    await Like.create({ comment: commentId, likedBy: req.user._id })
    return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: true }, "Comment liked successfully"))
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id")
    }

    const tweet = await Tweet.findById(tweetId)
    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }

    const alreadyLiked = await Like.findOne({ tweet: tweetId, likedBy: req.user._id })

    if (alreadyLiked) {
        await Like.findByIdAndDelete(alreadyLiked._id)
        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: false }, "Tweet unliked successfully"))
    }

    await Like.create({ tweet: tweetId, likedBy: req.user._id })
    return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: true }, "Tweet liked successfully"))
})

const getLikedVideos = asyncHandler(async (req, res) => {
    //1. Like collection me se is user ke video wale likes nikalo (comment/tweet likes nahi)
    //2. Har like ke video ki details lao (sirf published)
    //3. Video ke owner ki details bhi jodo
    //4. Like wrapper hatake sirf videos ki list return karo

    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user._id),
                video: { $exists: true }
            }
        },
        {
            $sort: { createdAt: -1 } // jo video abhi like ki wo sabse upar
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
                pipeline: [
                    { $match: { isPublished: true } },
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                { $project: { username: 1, fullname: 1, avatar: 1 } }
                            ]
                        }
                    },
                    {
                        $addFields: { owner: { $first: "$owner" } }
                    }
                ]
            }
        },
        {
            // delete/unpublished video ka array khaali hota hai, $unwind use hata deta hai
            $unwind: "$video"
        },
        {
            // like wrapper hatao, sirf video object rakho
            $replaceRoot: { newRoot: "$video" }
        }
    ])

    return res
        .status(200)
        .json(new ApiResponse(200, likedVideos, "Liked videos fetched successfully"))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}