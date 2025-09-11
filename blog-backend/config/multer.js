const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'avatar') {
            if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.mimetype)) {
                return cb(new Error('Avatar must be an image (JPEG, PNG, or GIF)'));
            }
        } else if (file.fieldname === 'pdf') {
            if (file.mimetype !== 'application/pdf') {
                return cb(new Error('Document must be a PDF'));
            }
        }
        cb(null, true);
    }
});

module.exports = { upload };