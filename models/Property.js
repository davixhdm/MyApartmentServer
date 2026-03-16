const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema({
  unitNumber: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'maintenance'],
    default: 'available'
  },
  currentTenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  price: {
    type: Number,
    required: true
  },
  bedrooms: {
    type: Number,
    default: 1
  },
  bathrooms: {
    type: Number,
    default: 1
  },
  area: {
    type: Number,
    default: 50
  }
});

const propertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a property title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  propertyCode: {
    type: String,
    required: [true, 'Please add a property code'],
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  basePrice: {
    type: Number,
    required: [true, 'Please add base price']
  },
  numberOfUnits: {
    type: Number,
    required: [true, 'Please add number of units'],
    min: [1, 'At least 1 unit required']
  },
  units: [unitSchema],
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String },
    zipCode: { type: String },
    country: { type: String, default: 'Kenya' }
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [36.817223, -1.286389], // Default to Nairobi coordinates
      validate: {
        validator: function(v) {
          return Array.isArray(v) && v.length === 2;
        },
        message: 'Coordinates must be an array of [longitude, latitude]'
      }
    }
  },
  type: {
    type: String,
    enum: ['apartment', 'house', 'commercial', 'land'],
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'maintenance', 'unavailable'],
    default: 'available'
  },
  bedrooms: {
    type: Number,
    default: 1
  },
  bathrooms: {
    type: Number,
    default: 1
  },
  area: {
    type: Number,
    default: 50
  },
  amenities: [{
    type: String,
    enum: ['parking', 'gym', 'pool', 'security', 'elevator', 'furnished', 'wifi', 'ac']
  }],
  images: [{
    url: String,
    public_id: String,
    isPrimary: { type: Boolean, default: false }
  }],
  landlord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  views: {
    type: Number,
    default: 0
  },
  isPublished: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create index for geospatial queries
propertySchema.index({ location: '2dsphere' });

// Virtual for available units count
propertySchema.virtual('availableUnits').get(function() {
  return this.units?.filter(u => u.status === 'available').length || 0;
});

// Virtual for occupied units count
propertySchema.virtual('occupiedUnits').get(function() {
  return this.units?.filter(u => u.status === 'occupied').length || 0;
});

// Method to generate units
propertySchema.methods.generateUnits = function() {
  const units = [];
  const prefix = this.propertyCode;
  
  for (let i = 1; i <= this.numberOfUnits; i++) {
    const unitNumber = `${prefix}-${i.toString().padStart(2, '0')}`;
    units.push({
      unitNumber,
      status: 'available',
      price: this.basePrice,
      bedrooms: this.bedrooms || 1,
      bathrooms: this.bathrooms || 1,
      area: this.area || 50
    });
  }
  
  this.units = units;
};

// Pre-save middleware to generate units
propertySchema.pre('save', function(next) {
  if (this.isNew || this.isModified('numberOfUnits') || this.isModified('propertyCode') || this.isModified('basePrice')) {
    this.generateUnits();
  }
  next();
});

module.exports = mongoose.model('Property', propertySchema);