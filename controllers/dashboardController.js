const User = require('../models/User');
const Property = require('../models/Property');
const Transaction = require('../models/Transaction');
const Maintenance = require('../models/Maintenance');
const Application = require('../models/Application');

// @desc    Get admin dashboard stats
// @route   GET /api/dashboard/admin
// @access  Private/Admin
exports.getAdminStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalLandlords,
      totalTenants,
      totalProperties,
      totalTransactions,
      totalRevenue,
      pendingMaintenance,
      pendingApplications
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'landlord' }),
      User.countDocuments({ role: 'tenant' }),
      Property.countDocuments(),
      Transaction.countDocuments(),
      Transaction.aggregate([
        { $match: { status: 'completed', type: 'rent' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Maintenance.countDocuments({ status: 'pending' }),
      Application.countDocuments({ status: 'pending' })
    ]);

    res.status(200).json({
      success: true,
      data: {
        users: { total: totalUsers, landlords: totalLandlords, tenants: totalTenants },
        properties: totalProperties,
        transactions: totalTransactions,
        revenue: totalRevenue[0]?.total || 0,
        pendingMaintenance,
        pendingApplications
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get landlord dashboard stats
// @route   GET /api/dashboard/landlord
// @access  Private/Landlord
exports.getLandlordStats = async (req, res, next) => {
  try {
    const landlordId = req.user.id;

    const [properties, totalIncome, pendingRequests, applications] = await Promise.all([
      Property.find({ landlord: landlordId }).countDocuments(),
      Transaction.aggregate([
        { $match: { landlord: mongoose.Types.ObjectId(landlordId), status: 'completed', type: 'rent' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Maintenance.countDocuments({ 
        property: { $in: await Property.find({ landlord: landlordId }).distinct('_id') },
        status: 'pending'
      }),
      Application.countDocuments({
        property: { $in: await Property.find({ landlord: landlordId }).distinct('_id') },
        status: 'pending'
      })
    ]);

    res.status(200).json({
      success: true,
      data: {
        properties,
        income: totalIncome[0]?.total || 0,
        pendingMaintenance: pendingRequests,
        pendingApplications: applications
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get tenant dashboard stats
// @route   GET /api/dashboard/tenant
// @access  Private/Tenant
exports.getTenantStats = async (req, res, next) => {
  try {
    const tenantId = req.user.id;

    const [myProperty, pendingPayments, maintenanceRequests] = await Promise.all([
      Property.findOne({ currentTenant: tenantId }).select('title address'),
      Transaction.countDocuments({ tenant: tenantId, status: 'pending' }),
      Maintenance.countDocuments({ tenant: tenantId, status: { $ne: 'completed' } })
    ]);

    res.status(200).json({
      success: true,
      data: {
        property: myProperty,
        pendingPayments,
        maintenanceRequests
      }
    });
  } catch (err) {
    next(err);
  }
};