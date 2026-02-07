const express = require('express');
const router = express.Router();
const { getMessageHistory } = require('../controllers/chatController');

router.get('/messages/:roomId', getMessageHistory);

module.exports = router;