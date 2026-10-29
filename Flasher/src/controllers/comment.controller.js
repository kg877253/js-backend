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
    const videoExists = await Video.findById(videoId)
    if (!videoExists) {
        throw new ApiError(404, "Video not found")
    }
    if (content?.trim() === "") {
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
    //1. get the comment id from the request params
    //2. Check if the comment exists and if the user is the owner of the comment
    //3. get the comment text from the request body
    //4. update the comment document in the database
    //5. return the updated comment in the response

    const { commentId } = req.params
    const { content } = req.body
    const userId = req.user._id

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id")
    }
    if (content?.trim() === "") {
        throw new ApiError(400, "Comment content is required")
    }

    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    if(userId.toString() !== comment.owner.toString()) {
        throw new ApiError(403, "You are not authorized to update this comment")
    }

    const updatedComment = await Comment.findByIdAndUpdate(commentId, 
        { content: content }, 
        { returnDocument: "after" }
    )

    return res
        .status(200)
        .json(new ApiResponse(200, updatedComment, "Comment updated successfully"))
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    //1. get the comment id from the request params
    //2. Check if the comment exists and if the user is the owner of the comment
    //3. delete the comment document from the database
    //4. return a success message in the response

    const { commentId } = req.params
    const userId = req.user._id

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id")
    }

    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    if(userId.toString() !== comment.owner.toString()) {
        throw new ApiError(403, "You are not authorized to delete this comment")
    }

    await Comment.findByIdAndDelete(commentId)

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Comment deleted successfully"))
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}