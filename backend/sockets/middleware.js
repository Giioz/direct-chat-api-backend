const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');


const socketAuthMiddleware = (socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) return next(new Error("Authentication error: No token provided"));

    try {
        // ვამოწმებთ იგივე გასაღებით!
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.username = decoded.username;
        next();
    } catch (err) {
        console.error("JWT Verify Error:", err.message); // <--- დავამატოთ ლოგი
        return next(new Error("Authentication error: Invalid token"));
    }
};

module.exports = socketAuthMiddleware;