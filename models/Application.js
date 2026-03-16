const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  applicationId: {
    type: String,
    unique: true,
    default: function() {
      return 'APP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 8).toUpperCase();
    }
  },
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: [true, 'Property is required']
  },
  propertyDetails: {
    title: String,
    propertyCode: String,
    address: {
      street: String,
      city: String
    }
  },
  unit: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Unit is required']
  },
  unitNumber: {
    type: String,
    required: [true, 'Unit number is required']
  },
  unitDetails: {
    price: Number,
    bedrooms: Number,
    bathrooms: Number,
    area: Number
  },
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Applicant is required']
  },
  status: {
    type: String,
    enum: ['pending', 'reviewing', 'approved', 'rejected', 'withdrawn'],
    default: 'pending'
  },
  personalInfo: {
    fullName: {
      type: String,
      required: [true, 'Full name is required']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email'
      ]
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required']
    },
    currentAddress: {
      type: String,
      required: [true, 'Current address is required']
    },
    employmentStatus: {
      type: String,
      enum: ['employed', 'self-employed', 'unemployed', 'student', 'retired'],
      required: [true, 'Employment status is required']
    },
    employer: {
      type: String,
      required: function() {
        return ['employed', 'self-employed'].includes(this.personalInfo.employmentStatus);
      }
    },
    monthlyIncome: {
      type: Number,
      required: [true, 'Monthly income is required'],
      min: [0, 'Monthly income cannot be negative']
    }
  },
  emergencyContact: {
    name: {
      type: String,
      required: [true, 'Emergency contact name is required']
    },
    relationship: {
      type: String,
      required: [true, 'Relationship is required']
    },
    phone: {
      type: String,
      required: [true, 'Emergency contact phone is required']
    }
  },
  documents: [{
    type: {
      type: String,
      enum: ['id', 'payslip', 'bank_statement', 'reference']
    },
    url: String,
    public_id: String,
    verified: {
      type: Boolean,
      default: false
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewDate: Date,
  reviewNotes: String,
  rejectionReason: String,
  leaseTerms: {
    startDate: Date,
    endDate: Date,
    duration: Number,
    deposit: Number,
    signed: {
      type: Boolean,
      default: false
    },
    signedDate: Date
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    submittedFrom: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for faster queries
applicationSchema.index({ property: 1, status: 1 });
applicationSchema.index({ applicant: 1, status: 1 });
applicationSchema.index({ 'unit.unitNumber': 1 });
applicationSchema.index({ applicationId: 1 });

// Pre-save middleware to populate property details
applicationSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('property')) {
    try {
      const Property = mongoose.model('Property');
      const property = await Property.findById(this.property);
      if (property) {
        this.propertyDetails = {
          title: property.title,
          propertyCode: property.propertyCode,
          address: {
            street: property.address?.street,
            city: property.address?.city
          }
        };
        
        // Find and store unit details
        const unit = property.units.id(this.unit);
        if (unit) {
          this.unitDetails = {
            price: unit.price,
            bedrooms: unit.bedrooms,
            bathrooms: unit.bathrooms,
            area: unit.area
          };
        }
      }
    } catch (error) {
      console.error('Error populating property details:', error);
    }
  }
  next();
});

// Method to check if application can be modified
applicationSchema.methods.canBeModified = function() {
  return ['pending', 'reviewing'].includes(this.status);
};

// Method to approve application
applicationSchema.methods.approve = async function(reviewedBy, notes) {
  this.status = 'approved';
  this.reviewedBy = reviewedBy;
  this.reviewDate = Date.now();
  this.reviewNotes = notes;
  
  // Update the unit status in the property
  const Property = mongoose.model('Property');
  const property = await Property.findById(this.property);
  if (property) {
    const unit = property.units.id(this.unit);
    if (unit) {
      unit.status = 'occupied';
      unit.currentTenant = this.applicant;
      await property.save();
    }
  }
  
  return this.save();
};

// Method to reject application
applicationSchema.methods.reject = async function(reviewedBy, reason) {
  this.status = 'rejected';
  this.reviewedBy = reviewedBy;
  this.reviewDate = Date.now();
  this.rejectionReason = reason;
  return this.save();
};

// Method to withdraw application
applicationSchema.methods.withdraw = async function() {
  this.status = 'withdrawn';
  return this.save();
};

// Static method to get applications by status
applicationSchema.statics.getByStatus = function(status) {
  return this.find({ status }).populate('property applicant').sort('-createdAt');
};

// Static method to check for duplicate applications
applicationSchema.statics.checkDuplicate = async function(propertyId, unitId, applicantId) {
  const existing = await this.findOne({
    property: propertyId,
    unit: unitId,
    applicant: applicantId,
    status: { $in: ['pending', 'reviewing'] }
  });
  return !!existing;
};

// Virtual for formatted date
applicationSchema.virtual('formattedDate').get(function() {
  return this.createdAt ? this.createdAt.toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : '';
});

// Virtual for time since submission
applicationSchema.virtual('timeSinceSubmitted').get(function() {
  if (!this.createdAt) return '';
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
});

module.exports = mongoose.model('Application', applicationSchema);