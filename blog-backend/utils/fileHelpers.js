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
        // SECURITY: Check for authenticated user
        if (!req.session.user) {
            await require('./logger').logAction('anonymous', 'file-access-denied', req.params.id, {
                reason: 'No authenticated user'
            });
            return res.status(401).json({ error: 'Unauthorized: Please log in' });
        }

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

        // FIXED: Specific origins for CORS
        const allowedOrigins = ['https://wrytix.netlify.app', 'http://localhost:5500'];
        const origin = req.headers.origin;
        if (allowedOrigins.includes(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        } else {
            await require('./logger').logAction(req.session.user?.username, 'file-access-denied', req.params.id, {
                reason: 'Invalid origin'
            });
            return res.status(403).json({ error: 'Forbidden: Invalid origin' });
        }
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Content-Type', mimeTypes[file[0].contentType] || 'application/octet-stream');

        gfs.openDownloadStream(fileId).pipe(res);
    } catch (err) {
        await require('./logger').logAction(req.session.user?.username || 'anonymous', 'file-access-error', req.params.id, {
            error: err.message
        });
        res.status(400).json({ error: 'Invalid file ID', details: err.message });
    }
};

module.exports = { uploadToGridFS, getFileById };