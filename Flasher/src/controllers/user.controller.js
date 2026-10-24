import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadToCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from 'jsonwebtoken';
import { getPublicIdFromUrl } from '../utils/getpublicId.js';

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
    console.log(email, fullname, username, password);

    //Step2
    //some ka use krke check kr rhe ki koi bhi field empty to nhi hai normal if else se bhi hoskta hai but ye short way hai
    if ([fullname, username, email, password].some((field) => !field?.trim())) {
        throw new ApiError(400, "All fields are required");
    }
    if (!email.includes("@") || !email.includes(".com")) {
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
    const existUser = await User.findOne({ $or: [{ email }, { username }] })
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
        { $unset: { refreshToken: 1 } },
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
    //2. Verify the refresh token using jwt.verify()
    //3. If valid, generate new access and refresh tokens
    //4. Update the user's refresh token in the database
    //5. Send the new tokens in cookies and response

    const incomingrefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingrefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingrefreshToken, process.env.JWT_REFRESH_SECRET)
        const user = await User.findById(decodedToken.userId)
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        if (user.refreshToken !== incomingrefreshToken) {
            throw new ApiError(401, "Invalid refresh token")
        }

        const { accessToken, newrefreshToken } = await generateAccessandRefreshToken(user._id);

        const options = {
            httpOnly: true,
            secure: true,
        }

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newrefreshToken, options)
            .json(new ApiResponse(200,
                {
                    accessToken,
                    refreshToken: newrefreshToken
                },
                "Access token refreshed successfully")
            )


    } catch (error) {
        throw new ApiError(500, "Error while refreshing access token")
    }

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
        const oldPublicId = getPublicIdFromUrl(oldAvatarUrl);
        if (oldPublicId) {
            try {
                await cloudinary.uploader.destroy(oldPublicId);
            } catch (error) {
                console.error("Old avatar deletion failed:", error);
            }
        }
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

    const coverImage = await uploadToCloudinary(coverImageLocalPath)
    if (!coverImage.url) {
        throw new ApiError(500, "Error uploading cover image to cloudinary");
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        { $set: { coverImage: coverImage.url } },
        { returnDocument: 'after' }
    ).select("-password -refreshToken");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Cover image updated successfully"));
})



export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getcurrentuser, updateaccountdetails, updateuseravatar, updateusercoverimage }