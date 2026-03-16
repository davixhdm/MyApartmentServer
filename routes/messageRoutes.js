const express = require('express');
const {
  getConversations,
  getConversationMessages,
  sendMessage,
  deleteMessage
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/conversations', getConversations);
router.get('/:conversationId', getConversationMessages);
router.post('/', sendMessage);
router.delete('/:id', deleteMessage);

module.exports = router;