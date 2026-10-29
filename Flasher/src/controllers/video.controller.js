import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query

    //Motive:  get all videos based on query, sort, pagination 

    //1. Sabse pehle published videos ko filter karna hai true or not
    //2. agar query hai to title aur description me search karna hai
    //3. agar userId hai to us user ke videos ko filter karna hai
    //4.TODO: sortBy aur sortType ke basis pe sort karna hai
    //5. TODO: pagination ke basis pe limit aur skip karna hai

    const filter = { isPublished: true }

    if (query?.trim()) {
        filter.$or = [ //match either title or description with the query
            //regex- searching for a matching text pattern(i-case insensitive(React=react))
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } }
        ]
    }

    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid userId")
        }
        filter.owner = userId;
    }

    const allvideos = await Video.find(filter).populate("owner", " username avatar fullname")
    const total = await Video.countDocuments(filter)

    if (!allvideos.length) {
        return res.status(404).json(new ApiResponse(404, null, "No videos found"))
    }

    return res.status(200).json(new ApiResponse(200, { allvideos, total }, "Videos fetched successfully"))

})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body
    if (!title?.trim() || !description?.trim()) {
        throw new ApiError(400, "Title and description are required")
    }

    // TODO: get video, upload to cloudinary, create video
    //Steps :
    //1. Get the video file and thumbnail from req.files
    //2. Upload the video file and thumbnail to cloudinary using uploadToCloudinary function
    //3. save the video details in the database using Video model
    //4. Return the response with the video details

    //Step-1
    const videofile = req.files?.videoFile?.[0]
    const thumbnail = req.files?.thumbnail?.[0]
    if (!videofile || !thumbnail) {
        throw new ApiError(400, "Video file and thumbnail are required")
    }
    
    if (!videofile.size || !thumbnail.size) {
        throw new ApiError(400, "Uploaded file is empty");
    }
    //Step-2
    const videoUpload = await uploadToCloudinary(videofile.path)
    const thumbnailUpload = await uploadToCloudinary(thumbnail.path)

    if (!videoUpload || !thumbnailUpload) {
        throw new ApiError(500, "Failed to upload video or thumbnail to cloudinary")
    }

    const duration = videoUpload.duration //in seconds

    //Step-3
    const video = await Video.create({
        title,
        duration,
        description,
        videoFile: videoUpload.url,
        thumbnail: thumbnailUpload.url,
        owner: req.user._id
    })

    return res.status(201).json(new ApiResponse(201, video, "Video published successfully"))
})


const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId")
    }

    const video = await Video.findById(videoId)

    // pehle check karo video mili ya nahi
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    // unpublished video sirf owner dekh sakta hai
    if (!video.isPublished && video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(404, "Video not found")
    }

    video.views += 1
    await video.save()

    const populatedVideo = await video.populate("owner", "username avatar fullname")

    return res
        .status(200)
        .json(new ApiResponse(200, populatedVideo, "Video fetched successfully"))
})


const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { title, description } = req.body
    const thumbnailLocalPath = req.file?.path

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId")
    }

    // kuch to update karne ko bhejo
    if (!title?.trim() && !description?.trim() && !thumbnailLocalPath) {
        throw new ApiError(400, "Provide at least one field to update")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    // sirf owner update kar sakta hai
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to update this video")
    }

    // text fields: sirf wahi badlo jo aaye
    if (title?.trim()) video.title = title.trim()
    if (description?.trim()) video.description = description.trim()

    // thumbnail: naya aaya to hi upload + purana delete
    const oldThumbnail = video.thumbnail
    let thumbnailChanged = false

    if (thumbnailLocalPath) {
        const newThumbnail = await uploadToCloudinary(thumbnailLocalPath)
        if (!newThumbnail) {
            throw new ApiError(500, "Failed to upload new thumbnail")
        }
        video.thumbnail = newThumbnail.url
        thumbnailChanged = true
    }

    // pehle DB me save
    await video.save()

    // save ke baad purana delete (order important hai)
    if (thumbnailChanged) {
        await deleteFromCloudinary(oldThumbnail, "image")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video updated successfully"))
})


const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to delete this video")
    }
    const oldThumbnail = video.thumbnail
    const oldVideoFile = video.videoFile
    // Delete the video
    await Video.findByIdAndDelete(videoId)

    // Delete the thumbnail and video file from Cloudinary
    await deleteFromCloudinary(oldThumbnail, "image")
    await deleteFromCloudinary(oldVideoFile, "video")

    //TODO: delete likes, comments, watch history, etc. related to this video

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Video deleted successfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to toggle publish status of this video")
    }

    video.isPublished = !video.isPublished
    await video.save()

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Publish status toggled successfully"))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}