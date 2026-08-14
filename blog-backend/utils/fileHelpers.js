const mongoose = require('mongoose');
const { logger } = require('../config/logger'); // adjust path if needed

let gfs;
mongoose.connection.once('open', () => {
    gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    logger.info('✅ GridFS bucket initialized: uploads');
});

const ensureGFS = () => {
    if (!gfs) throw new Error('GridFS not ready – connection may not be open.');
    return gfs;
};

const uploadToGridFS = (file, filename) => {
    return new Promise((resolve, reject) => {
        const gfs = ensureGFS();
        const uploadStream = gfs.openUploadStream(filename, {
            contentType: file.mimetype
        });
        uploadStream.end(file.buffer);
        uploadStream.on('finish', () => resolve(uploadStream.id));
        uploadStream.on('error', reject);
    });
};

const getFileById = async (req, res) => {
    try {
        logger.info(`🔍 Fetching file: ${req.params.id}`);
        const gfs = ensureGFS();

        const fileId = new mongoose.Types.ObjectId(req.params.id);
        const file = await gfs.find({ _id: fileId }).toArray();

        if (file && file.length > 0) {
            logger.info('📄 File metadata:', {
                id: file[0]._id,
                filename: file[0].filename,
                contentType: file[0].contentType,
                length: file[0].length,
                uploadDate: file[0].uploadDate,
                chunkSize: file[0].chunkSize
            });
        } else {
            logger.warn('⚠️ File not found in GridFS:', req.params.id);
            return res.status(404).send('File not found');
        }

        // Use the actual content type (or fallback)
        const contentType = file[0].contentType || 'application/octet-stream';
        logger.info(`📤 Serving with Content-Type: ${contentType}`);

        res.setHeader('Content-Type', contentType);
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

        // --- Track stream events ---
        const stream = gfs.openDownloadStream(fileId);
        let bytesSent = 0;
        stream.on('data', (chunk) => {
            bytesSent += chunk.length;
        });
        stream.on('end', () => {
            logger.info(`✅ Stream finished – sent ${bytesSent} bytes`);
        });
        stream.on('error', (err) => {
            logger.error('❌ Stream error:', err);
        });

        stream.pipe(res);
    } catch (err) {
        logger.error('❌ Error serving file:', err);
        res.status(400).send('Invalid file ID or server error');
    }
};

module.exports = { uploadToGridFS, getFileById };