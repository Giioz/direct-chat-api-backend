const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/jwt');

const register = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // ვამოწმებთ, არსებობს თუ არა ასეთი სახელი
        const existingUser = await User.findOne({ username });
        if (existingUser) return res.status(400).json({ error: "Username already taken" });

        // პაროლის დაშიფვრა
        const hashedPassword = await bcrypt.hash(password, 10);

        // იუზერის შექმნა
        await User.create({
            username,
            password: hashedPassword
        });

        res.json({ success: true, message: "User created! Please login." });
    } catch (err) {
        console.error("Register Error:", err);
        res.status(500).json({ error: "Registration failed" });
    }
};

const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ error: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

        // ვიყენებთ იმპორტირებულ JWT_SECRET-ს
        const token = jwt.sign(
            { username: user.username, id: user._id }, 
            JWT_SECRET, 
            { expiresIn: "7d" }
        );

        res.json({ success: true, token, username: user.username });
    } catch (err) {
        res.status(500).json({ error: "Login failed" });
    }
};

module.exports = { register, login };