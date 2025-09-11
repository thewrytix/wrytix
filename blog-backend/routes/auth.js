const express = require('express');
const { login, logout, checkAuth, verifySession } = require('../controllers/authController');
const { checkUsername, checkEmail } = require('../middleware/validation');

const router = express.Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/auth/check', checkAuth);
router.get('/verify-session', verifySession);
router.get('/check-username', checkUsername);
router.get('/check-email', checkEmail);

module.exports = router;