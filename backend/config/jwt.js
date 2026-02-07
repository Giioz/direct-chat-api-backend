require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || "MY_SUPER_SECURE_CHAT_KEY_2024";

module.exports = { JWT_SECRET };