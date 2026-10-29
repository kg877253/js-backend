import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
        // unique naam, taaki do users ek saath "video.mp4" upload karein to clash na ho
        cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + "-" + file.originalname)
    }
})

export const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100 MB
})