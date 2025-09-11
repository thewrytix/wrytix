const express = require('express');
const { getComments, createComment } = require('../controllers/commentController');

const router = express.Router();

router.get('/comments', getComments);
router.post('/comments', createComment);

module.exports = router;