module.exports = {
  ROLES: {
    TENANT: 'tenant',
    LANDLORD: 'landlord',
    ADMIN: 'admin'
  },
  
  PROPERTY_STATUS: {
    AVAILABLE: 'available',
    OCCUPIED: 'occupied',
    MAINTENANCE: 'maintenance',
    UNAVAILABLE: 'unavailable'
  },
  
  PROPERTY_TYPES: {
    APARTMENT: 'apartment',
    HOUSE: 'house',
    COMMERCIAL: 'commercial',
    LAND: 'land'
  },
  
  TRANSACTION_TYPES: {
    RENT: 'rent',
    DEPOSIT: 'deposit',
    MAINTENANCE: 'maintenance',
    UTILITY: 'utility',
    FINE: 'fine',
    REFUND: 'refund'
  },
  
  TRANSACTION_STATUS: {
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded',
    CANCELLED: 'cancelled'
  },
  
  MAINTENANCE_PRIORITY: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    EMERGENCY: 'emergency'
  },
  
  MAINTENANCE_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    REJECTED: 'rejected'
  },
  
  APPLICATION_STATUS: {
    PENDING: 'pending',
    REVIEWING: 'reviewing',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    WITHDRAWN: 'withdrawn',
    WAITING: 'waiting'
  },
  
  PAYMENT_METHODS: {
    CASH: 'cash',
    MPESA: 'mpesa',
    BANK_TRANSFER: 'bank_transfer',
    CREDIT_CARD: 'credit_card',
    CHEQUE: 'cheque'
  }
};