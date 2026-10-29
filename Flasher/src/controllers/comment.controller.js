import mongoose, { isValidObjectId } from "mongoose"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const aggregate = Comment.aggregate([
        {
            $match: { video: new mongoose.Types.ObjectId(videoId) }
        },
        {
            $sort: { createdAt: -1 }
        },
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
    ])

    const comments = await Comment.aggregatePaginate(aggregate, {
        page: parseInt(page),
        limit: parseInt(limit)
    })

    return res
        .status(200)
        .json(new ApiResponse(200, comments, "Comments fetched successfully"))
})

const addComment = asyncHandler(async (req, res) => {
    
    //1. get the user id from the request object (req.user._id)
    // 2. get the video id from the request params
    // 3. get the comment text from the request body
    // 4. create a new comment document in the database
    // 5. return the newly created comment in the response

    const userId = req.user._id
    const { videoId } = req.params
    const { content } = req.body

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }
    if (!content) {
        throw new ApiError(400, "Comment content is required")
    }

    const newComment = await Comment.create({
        content: content,
        owner: userId,
        video: videoId
    })

    return res
        .status(201)
        .json(new ApiResponse(201, newComment, "Comment added successfully"))

})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}