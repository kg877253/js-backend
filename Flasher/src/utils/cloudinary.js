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

const deleteFromCloudinary = async (fileUrl, resourceType = "image") => {
    try {
        if (!fileUrl) return null

        // URL se public_id nikalna
        // .../upload/v1730000000/abcd1234.jpg  ->  abcd1234
        const publicId = fileUrl.split("/").pop().split(".")[0]

        const response = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType
        })
        return response
    } catch (error) {
        // delete fail ho to bhi request fail nahi karni, bas log karo
        console.log("Cloudinary delete failed:", error.message)
        return null
    }
}

export { uploadToCloudinary, deleteFromCloudinary }