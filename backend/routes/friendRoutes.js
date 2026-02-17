const express = require('express');
const router = express.Router();
const {
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    getFriends
} = require('../controllers/friendController');
const authMiddleware = require('../middleware/authMiddleware');

// Protected Routes
router.use(authMiddleware);

router.post('/request', sendFriendRequest);
router.post('/accept', acceptFriendRequest);
router.post('/decline', declineFriendRequest);
router.get('/', getFriends);

module.exports = router;
