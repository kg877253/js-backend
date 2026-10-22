import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadToCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) throw new Error("File path is required for upload");
        // Upload the file to Cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });
        console.log("File uploaded to cloudinary", response.url);
        //return the response from Cloudinary
        fs.unlinkSync(localFilePath); // Delete the local file after successful upload
        return response;
    } catch (error) {
        console.log("Cloudinary upload failed:", error.message);
        if (localFilePath && fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath); // fail pe bhi delete
        }
        return null;
    }
}

export { uploadToCloudinary }