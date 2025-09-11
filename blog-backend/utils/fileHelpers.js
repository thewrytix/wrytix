const mongoose = require('mongoose');

let gfs;
mongoose.connection.once('open', () => {
    gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
});

const uploadToGridFS = (file, filename) => {
    return new Promise((resolve, reject) => {
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
        const fileId = new mongoose.Types.ObjectId(req.params.id);
        const file = await gfs.find({ _id: fileId }).toArray();
        if (!file || file.length === 0) {
            await require('./logger').logAction(req.session.user?.username || 'anonymous', 'file-download-failed', req.params.id, {
                reason: 'File not found'
            });
            return res.status(404).json({ error: 'File not found' });
        }

        const mimeTypes = {
            'image/jpeg': 'image/jpeg',
            'image/png': 'image/png',
            'image/gif': 'image/gif',
            'application/pdf': 'application/pdf'
        };
        res.setHeader('Content-Type', mimeTypes[file[0].contentType] || 'application/octet-stream');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        gfs.openDownloadStream(fileId).pipe(res);
    } catch (err) {
        await require('./logger').logAction(req.session.user?.username || 'anonymous', 'file-access-error', req.params.id, {
            error: err.message
        });
        res.status(400).json({ error: 'Invalid file ID', details: err.message });
    }
};

module.exports = { uploadToGridFS, getFileById };