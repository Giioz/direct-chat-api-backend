// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router(); // <--- აი, ეს გაკლდა!
const { register, login } = require('../controllers/authController'); // ვიძახებთ კონტროლერს

router.post('/register', register);
router.post('/login', login);

module.exports = router; 