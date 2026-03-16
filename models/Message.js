const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipients: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    read: { type: Boolean, default: false },
    readAt: Date,
    delivered: { type: Boolean, default: false },
    deliveredAt: Date
  }],
  subject: {
    type: String,
    trim: true,
    maxlength: [200, 'Subject cannot be more than 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    maxlength: [2000, 'Message cannot be more than 2000 characters']
  },
  attachments: [{
    name: String,
    url: String,
    size: Number,
    mimeType: String
  }],
  isSystem: {
    type: Boolean,
    default: false
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  relatedTo: {
    model: {
      type: String,
      enum: ['Property', 'Maintenance', 'Transaction', 'Application']
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'relatedTo.model'
    }
  },
  parentMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  deletedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Generate conversation ID before save
messageSchema.pre('save', function(next) {
  if (!this.conversationId) {
    if (this.parentMessage) {
      this.conversationId = this.parentMessage.conversationId;
    } else {
      this.conversationId = 'CONV-' + Date.now() + '-' + Math.random().toString(36).substr(2, 10);
    }
  }
  next();
});

module.exports = mongoose.model('Message', messageSchema);