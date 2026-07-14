const { verifyToken } = require('../config/jwt');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
      return res.status(401).json({ success: false, message: 'Not authorized' });

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ success: false, message: 'User not found' });

    if (req.user.bannedAt || !req.user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is banned or inactive' });
    }

    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

module.exports = { protect };
