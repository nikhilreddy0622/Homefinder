const express = require('express');
const {
  getChats,
  getChat,
  createChat,
  sendMessage,
  getUnreadCount,
  markAsRead
} = require('../controllers/chats');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(protect, getChats)
  .post(protect, createChat);

router.route('/unread-count')
  .get(protect, getUnreadCount);

router.route('/:id')
  .get(protect, getChat);

router.route('/:id/messages')
  .post(protect, sendMessage);

router.route('/:id/read')
  .put(protect, markAsRead);

module.exports = router;