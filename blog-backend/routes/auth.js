const express = require('express');
const cors = require('cors');
const { login, logout, checkAuth, verifySession, signup} = require('../controllers/authController');
console.log('Auth routes loaded - signup function:', typeof signup); // Should log 'function'
const { checkUsername, checkEmail } = require('../middleware/validation');
const { corsOptions } = require('../config/middleware');

const router = express.Router();

// Apply CORS to specific routes if needed (but global should handle it)
router.options('/check-username', cors(corsOptions));
router.options('/check-email', cors(corsOptions));

router.post('/login', login);
router.post('/signup', signup); // Fresh addition
router.post('/logout', logout);
router.get('/auth/check', checkAuth);
router.get('/verify-session', verifySession);
router.get('/check-username', cors(corsOptions), checkUsername);
router.get('/check-email', cors(corsOptions), checkEmail);

module.exports = router;

