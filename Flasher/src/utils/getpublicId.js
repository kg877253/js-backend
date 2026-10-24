export const getPublicIdFromUrl = (url) => {
    const parts = url.split("/");
    const uploadIndex = parts.findIndex(part => part === "upload");

    if (uploadIndex === -1) return null;

    const publicIdWithExtension = parts
        .slice(uploadIndex + 2)
        .join("/");

    return publicIdWithExtension.replace(/\.[^/.]+$/, "");
};
