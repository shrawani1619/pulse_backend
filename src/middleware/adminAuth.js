const { protect } = require('./auth');

const adminProtect = [
  protect,
  (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
  }
];

module.exports = { adminProtect };
