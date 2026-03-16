const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
  requestId: {
    type: String,
    unique: true,
    default: () => 'MNT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase()
  },
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  category: {
    type: String,
    enum: ['plumbing', 'electrical', 'structural', 'appliance', 'pest', 'cleaning', 'other'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'emergency'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'in_progress', 'completed', 'cancelled', 'rejected'],
    default: 'pending'
  },
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Could be maintenance staff or landlord
  },
  images: [{
    url: String,
    public_id: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  estimatedCost: {
    type: Number
  },
  actualCost: {
    type: Number
  },
  scheduledDate: Date,
  completedDate: Date,
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: String,
    createdAt: { type: Date, default: Date.now }
  }],
  attachments: [{
    name: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Maintenance', maintenanceSchema);