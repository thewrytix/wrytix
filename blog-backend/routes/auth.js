const express = require('express');
const cors = require('cors');
const { login, logout, checkAuth, verifySession, signup} = require('../controllers/authController');
const { checkUsername, checkEmail } = require('../middleware/validation');
const { corsOptions } = require('../config/middleware');

const router = express.Router();

// Apply CORS to specific routes if needed (but global should handle it)
router.options('/check-username', cors(corsOptions));
router.options('/check-email', cors(corsOptions));

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.get('/check', checkAuth);
router.get('/verify-session', verifySession);
router.get('/check-username', cors(corsOptions), checkUsername);
router.get('/check-email', cors(corsOptions), checkEmail);

module.exports = router;

