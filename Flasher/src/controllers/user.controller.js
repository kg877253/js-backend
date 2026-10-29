import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const generateAccessandRefreshToken = async (userId) => {

    try {
        const user = await User.findById(userId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken }
    }
    catch (error) {
        throw new ApiError(500, "Error generating tokens")
    }
}

//Tested(-avatar -coverImage) and working fine
const registerUser = asyncHandler(async (req, res) => {

    // 1. Get details from frontend wtever we are taking ..
    // 2. Now validate these like not empty or not.
    // 3. Check if User already exists in the database or not from : username ,email..
    // 4. Check for images, check for avatar
    // 5. Upload these to cloudinary , avatar
    // 6. Create user object --create entry in db
    // 7. From response --remove password and refresh token 
    // 8. Check for user creation---return response

    //Step1
    const { fullname, username, email, password } = req.body;

    //Step2
    //some ka use krke check kr rhe ki koi bhi field empty to nhi hai normal if else se bhi hoskta hai but ye short way hai
    if ([fullname, username, email, password].some((field) => !field?.trim())) {
        throw new ApiError(400, "All fields are required");
    }
    const emailRegex = /^\S+@\S+\.\S+$/   // kuch@kuch.kuch format
    if (!emailRegex.test(email)) {
        throw new ApiError(400, "Email is not valid")
    }

    //Step3
    const existedUser = await User.findOne({ $or: [{ email }, { username }] })
    if (existedUser) {
        throw new ApiError(409, "User already exists")
    }

    //Step4
    //Optimal way to check for files and get their path jo humare public folder me save ho rhe hai(before cloudinary upload)
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
    let coverImageLocalPath;

    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required")
    }

    //Step5
    //upload to cloudinary
    const avatar = await uploadToCloudinary(avatarLocalPath);
    const coverImage = coverImageLocalPath
        ? await uploadToCloudinary(coverImageLocalPath)
        : null;
    if (!avatar) {
        throw new ApiError(400, "Avatar is required ")
    }

    //Step6
    //create user in db
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "", //optional
        username: username.toLowerCase(),
        email,
        password,
    })

    //Step7
    //remove password and refresh token from response
    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    if (!createdUser) {
        throw new ApiError(500, "User not created")
    }

    // Step8-->return response to frontend
    return res.status(201).json(new ApiResponse(200, createdUser, "User created successfully in db yahhu"))
});


const loginUser = asyncHandler(async (req, res) => {

    //1. Get details from frontend (req body se ->data)
    //2. Now check that this user exists or not in db from email or username
    //3. If not redirect to register page , 
    //4. If yes then check password ... password matches then 
    //5. Generate access and refresh token 
    //6. Send them in cookies 
    //7. response bhej do ki validate hogya y nhi

    //Step1
    const { email, username, password } = req.body;
    if (!(email || username)) {
        throw new ApiError(400, "Email or username is required")
    }

    //Step2
    const existUser = await User.findOne({ $or: [{ email }, { username: username?.toLowerCase() }] })
    if (!existUser) { //if user doesn't exist(Step3)
        throw new ApiError(404, "User doesn't exists please register first")
    }

    //Step4
    const isPassValid = await existUser.iscorrectpassword(password)
    if (!isPassValid) {
        throw new ApiError(401, "Password is incorrect")
    }

    //5. Generate access and refresh token
    const { accessToken, refreshToken } = await generateAccessandRefreshToken(existUser._id);


    const loggedInUser = await User.findById(existUser._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true,
    }

    //6. Send them in cookies
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200,
            {
                user: loggedInUser,
                accessToken,
                refreshToken
            },
            "User logged in successfully")
        )

})


const logoutUser = asyncHandler(async (req, res) => {

    // req.user is set in verifyJWT middleware, so we can access the logged-in user from req.user
    //1. Get user from req.user
    //2. Remove refresh token from db
    //3. Clear cookies from frontend
    //4. Send response to frontend

    await User.findByIdAndUpdate(
        req.user._id,
        { $unset: { refreshToken: 1 } }, //this removes the field from the document
        { returnDocument: 'after' }
    );

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"))
})


const refreshAccessToken = asyncHandler(async (req, res) => {
    //1. Get refresh token from cookies or request body
    //2. Verify it with jwt.verify() (fail ho to 401)
    //3. User dhundo aur DB wale token se match karo
    //4. Naye access + refresh token banao (DB me bhi save hota hai)
    //5. Cookies aur response me bhejo

    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request")
    }

    // try/catch sirf jwt.verify ke liye (invalid/expired token => 401)
    let decodedToken
    try {
        decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    } catch (error) {
        throw new ApiError(401, "Invalid or expired refresh token")
    }

    const user = await User.findById(decodedToken._id)
    if (!user) {
        throw new ApiError(401, "Invalid refresh token")
    }

    // purana/reuse hua token yahan pakda jayega
    if (user.refreshToken !== incomingRefreshToken) {
        throw new ApiError(401, "Refresh token is expired or already used")
    }

    // naam wahi jo generateAccessandRefreshToken return karta hai
    const { accessToken, refreshToken } = await generateAccessandRefreshToken(user._id)

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200,
            { accessToken, refreshToken },
            "Access token refreshed successfully"
        ))
})


const changeCurrentPassword = asyncHandler(async (req, res) => {

    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user?._id);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isOldPasswordValid = await user.iscorrectpassword(oldPassword);
    if (!isOldPasswordValid) {
        throw new ApiError(401, "Old password is incorrect");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));
})


const getcurrentuser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user?._id).select("-password -refreshToken");
    return res
        .status(200)
        .json(new ApiResponse(200, user, "Current user details fetched successfully"));
})


const updateaccountdetails = asyncHandler(async (req, res) => {
    const { fullname, email } = req.body;

    const user = await User.findByIdAndUpdate(req.user?._id,
        { $set: { fullname, email } },
        { returnDocument: 'after' }
    ).select("-password -refreshToken");

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"));
})


const updateuseravatar = asyncHandler(async (req, res) => {
    const avatarlocalPath = req.file?.path;
    if (!avatarlocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    const user = await User.findById(req.user?._id);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const oldAvatarUrl = user.avatar;
    const avatar = await uploadToCloudinary(avatarlocalPath);
    if (!avatar?.url) {
        throw new ApiError(500, "Error uploading avatar to Cloudinary");
    }

    user.avatar = avatar.url;
    await user.save();

    if (oldAvatarUrl) {
        await deleteFromCloudinary(oldAvatarUrl, "image");
    }

    const updatedUser = await User.findById(user._id)
        .select("-password -refreshToken");

    return res.status(200).json(
        new ApiResponse(200, updatedUser, "Avatar updated successfully")
    );
});


const updateusercoverimage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is required");
    }

    // purana URL pehle hi rakh lo (req.user me coverImage aati hai)
    const oldCoverImage = req.user.coverImage

    const coverImage = await uploadToCloudinary(coverImageLocalPath)
    if (!coverImage?.url) {
        throw new ApiError(500, "Error uploading cover image to cloudinary");
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        { $set: { coverImage: coverImage.url } },
        { returnDocument: 'after' }
    ).select("-password -refreshToken");

    // save ke baad purana delete (khaali "" ho to function khud chhod deta hai)
    await deleteFromCloudinary(oldCoverImage, "image")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Cover image updated successfully"));
})


const getUserChannelProfile = asyncHandler(async (req, res) => {

    const { username } = req.params;
    if (!username?.trim()) {
        throw new ApiError(400, "Username is required")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions", //in model its name is Subscription but in db it will be subscriptions
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedtochannels"
            }
        },
        {
            $addFields: {
                // ye jo humne 1st lookup me subscribers ka array banaya uska size count krke subscribersCount me dal diya
                subscribersCount: { $size: "$subscribers" },
                //ye jo humne 2nd lookup me subscribedtochannels ka array banaya uska size count krke subscribedToChannelsCount me dal diya
                subscribedToChannelsCount: { $size: "$subscribedtochannels" },
                isSubscribed: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$subscribers.subscriber"]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                subscribedToChannelsCount: 1,
                isSubscribed: 1,
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "Channel not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, channel[0], "Channel profile fetched successfully"))
})


const getWatchHistory = asyncHandler(async (req, res) => {

    const user = await User.aggregate([
        {
            $match: {
                //ye sidha mongo db me jata hai isiliye humne mongoose.Types.ObjectId ka use kiya hai 
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: { $arrayElemAt: ["$owner", 0] }
                        }
                    }
                ]
            }
        }
    ])

    return res
        .status(200)
        .json(new ApiResponse(200, user[0]?.watchHistory || [], "Watch history fetched successfully"))
})


export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getcurrentuser, updateaccountdetails, updateuseravatar, updateusercoverimage, getUserChannelProfile, getWatchHistory }