const User = require('../models/User');
const { generateToken } = require('../config/jwt');

// POST /api/v1/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });

    const user = await User.create({ name, email, password });
    const token = generateToken({ id: user._id, role: user.role });
    res.status(201).json({ success: true, token, user });
  } catch (error) { next(error); }
};

// POST /api/v1/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid email or password' });

    if (user.bannedAt || !user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is banned or inactive' });
    }

    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken({ id: user._id, role: user.role });
    res.json({ success: true, token, user });
  } catch (error) { next(error); }
};

// GET /api/v1/auth/me
exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

// PUT /api/v1/auth/me
exports.updateMe = async (req, res, next) => {
  try {
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.avatar !== undefined) updates.avatar = req.body.avatar;

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true
    }).select('-password');

    res.json({ success: true, user });
  } catch (error) { next(error); }
};
