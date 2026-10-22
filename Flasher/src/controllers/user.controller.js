import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadToCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

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

export { registerUser }