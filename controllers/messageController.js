const Message = require('../models/Message');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get conversations for current user
// @route   GET /api/messages/conversations
// @access  Private
exports.getConversations = async (req, res, next) => {
  try {
    const messages = await Message.aggregate([
      { $match: { 'recipients.user': req.user.id, deletedFor: { $ne: req.user.id } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$recipients.read', false] },
                  { $ne: ['$sender', req.user.id] }
                ]},
                1,
                0
              ]
            }
          }
        }
      },
      { $replaceRoot: { newRoot: { $mergeObjects: ['$lastMessage', { unreadCount: '$unreadCount' }] } } }
    ]);
    // Populate sender and recipients
    await Message.populate(messages, [
      { path: 'sender', select: 'name email profileImage' },
      { path: 'recipients.user', select: 'name email profileImage' }
    ]);
    res.status(200).json({ success: true, count: messages.length, data: messages });
  } catch (err) {
    next(err);
  }
};

// @desc    Get messages in a conversation
// @route   GET /api/messages/:conversationId
// @access  Private
exports.getConversationMessages = async (req, res, next) => {
  try {
    const messages = await Message.find({
      conversationId: req.params.conversationId,
      deletedFor: { $ne: req.user.id }
    })
      .populate('sender', 'name email profileImage')
      .populate('recipients.user', 'name email profileImage')
      .sort('createdAt');
    // Mark messages as read
    await Message.updateMany(
      {
        conversationId: req.params.conversationId,
        'recipients.user': req.user.id,
        'recipients.read': false
      },
      {
        $set: {
          'recipients.$.read': true,
          'recipients.$.readAt': Date.now()
        }
      }
    );
    res.status(200).json({ success: true, count: messages.length, data: messages });
  } catch (err) {
    next(err);
  }
};

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
exports.sendMessage = async (req, res, next) => {
  try {
    const { recipientIds, subject, content, relatedTo } = req.body;
    if (!recipientIds || !content) {
      return next(new ErrorResponse('Please provide recipients and content', 400));
    }
    // Build recipients array
    const recipients = recipientIds.map(id => ({ user: id, read: false }));
    // Create conversationId if not provided (first message)
    let conversationId = req.body.conversationId;
    if (!conversationId) {
      conversationId = 'CONV-' + Date.now() + '-' + Math.random().toString(36).substr(2, 10);
    }
    const message = await Message.create({
      conversationId,
      sender: req.user.id,
      recipients,
      subject,
      content,
      relatedTo
    });
    const populated = await Message.populate(message, [
      { path: 'sender', select: 'name email profileImage' },
      { path: 'recipients.user', select: 'name email profileImage' }
    ]);
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a message (soft delete for user)
// @route   DELETE /api/messages/:id
// @access  Private
exports.deleteMessage = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return next(new ErrorResponse('Message not found', 404));
    }
    // Add current user to deletedFor array
    if (!message.deletedFor.includes(req.user.id)) {
      message.deletedFor.push(req.user.id);
      await message.save();
    }
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};