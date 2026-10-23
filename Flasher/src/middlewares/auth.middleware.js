import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler";
import User from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {

    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({ message: "Access denied. No token provided." });
        }

        const decodedToken = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedToken._id).select("-password -refreshToken")
        if (!user) {
            return res.status(401).json({ message: "Access denied. User not found." });
        }
        // Attach the user object to the request for further use in the route handlers
        req.user = user;
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid token");
    }

    next();
})