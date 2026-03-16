const Transaction = require('../models/Transaction');
const Property = require('../models/Property');
const Maintenance = require('../models/Maintenance');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get financial summary
// @route   GET /api/reports/financial
// @access  Private (admin, landlord)
exports.getFinancialReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    let match = {};
    if (req.user.role === 'landlord') {
      const properties = await Property.find({ landlord: req.user.id }).select('_id');
      const propertyIds = properties.map(p => p._id);
      match.property = { $in: propertyIds };
    }

    const transactions = await Transaction.aggregate([
      { $match: { ...match, ...dateFilter } },
      {
        $group: {
          _id: null,
          totalIncome: {
            $sum: { $cond: [{ $eq: ['$type', 'rent'] }, '$amount', 0] }
          },
          totalExpenses: {
            $sum: { $cond: [{ $eq: ['$type', 'maintenance'] }, '$amount', 0] }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: transactions[0] || { totalIncome: 0, totalExpenses: 0, count: 0 }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get occupancy report
// @route   GET /api/reports/occupancy
// @access  Private (admin, landlord)
exports.getOccupancyReport = async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role === 'landlord') {
      filter.landlord = req.user.id;
    }
    const properties = await Property.find(filter);
    const total = properties.length;
    const occupied = properties.filter(p => p.status === 'occupied').length;
    const vacant = properties.filter(p => p.status === 'available').length;
    const maintenance = properties.filter(p => p.status === 'maintenance').length;

    res.status(200).json({
      success: true,
      data: { total, occupied, vacant, maintenance }
    });
  } catch (err) {
    next(err);
  }
};