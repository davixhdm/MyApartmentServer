const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    unique: true,
    default: () => 'TXN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase()
  },
  type: {
    type: String,
    enum: ['rent', 'deposit', 'maintenance', 'utility', 'fine', 'refund'],
    required: true
  },
  amount: {
    type: Number,
    required: [true, 'Please add an amount']
  },
  currency: {
    type: String,
    default: 'KES'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'mpesa', 'bank_transfer', 'credit_card', 'cheque'],
    required: true
  },
  paymentReference: {
    type: String,
    unique: true,
    sparse: true
  },
  description: {
    type: String,
    maxlength: [200, 'Description cannot be more than 200 characters']
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
  landlord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receipt: {
    url: String,
    generatedAt: Date
  },
  dueDate: {
    type: Date
  },
  paidDate: {
    type: Date
  },
  notes: String,
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Index for searching
transactionSchema.index({ transactionId: 'text', paymentReference: 'text' });

module.exports = mongoose.model('Transaction', transactionSchema);