const User = require('../models/User');
const Dream = require('../models/Dream');
const Goal = require('../models/Goal');
const Milestone = require('../models/Milestone');
const Action = require('../models/Action');
const DreamTime = require('../models/DreamTime');
const FocusSession = require('../models/FocusSession');
const Achievement = require('../models/Achievement');

const escapeRegex = (str = '') => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function countsForUser(userId) {
  const [dreamCount, goalCount, actionCount] = await Promise.all([
    Dream.countDocuments({ user: userId }),
    Goal.countDocuments({ user: userId }),
    Action.countDocuments({ user: userId })
  ]);
  return { dreamCount, goalCount, actionCount };
}

function userStatus(user) {
  if (user.bannedAt) return 'banned';
  if (!user.isActive) return 'inactive';
  return 'active';
}

// GET /api/v1/admin/stats
exports.getStats = async (req, res, next) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      activeUsers,
      bannedUsers,
      totalDreams,
      totalGoals,
      actionsCompleted,
      growthRaw
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      User.countDocuments({ role: { $ne: 'admin' }, isActive: true, bannedAt: null }),
      User.countDocuments({ role: { $ne: 'admin' }, bannedAt: { $ne: null } }),
      Dream.countDocuments(),
      Goal.countDocuments(),
      Action.countDocuments({ status: 'completed' }),
      User.aggregate([
        {
          $match: {
            role: { $ne: 'admin' },
            createdAt: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    const growthMap = Object.fromEntries(growthRaw.map((g) => [g._id, g.count]));
    const growth = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(thirtyDaysAgo.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      growth.push({ date: key, count: growthMap[key] || 0 });
    }

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        bannedUsers,
        totalDreams,
        totalGoals,
        actionsCompleted,
        growth
      }
    });
  } catch (error) { next(error); }
};

// GET /api/v1/admin/users
exports.getUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 15));
    const search = (req.query.search || '').trim();
    const status = (req.query.status || 'all').toLowerCase();

    const filter = { role: { $ne: 'admin' } };
    if (search) {
      const re = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ name: re }, { email: re }];
    }
    if (status === 'active') {
      filter.isActive = true;
      filter.bannedAt = null;
    } else if (status === 'banned') {
      filter.bannedAt = { $ne: null };
    } else if (status === 'inactive') {
      filter.isActive = false;
      filter.bannedAt = null;
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select('-password'),
      User.countDocuments(filter)
    ]);

    const enriched = await Promise.all(users.map(async (u) => {
      const counts = await countsForUser(u._id);
      return {
        ...u.toJSON(),
        status: userStatus(u),
        ...counts
      };
    }));

    res.json({
      success: true,
      users: enriched,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1
      }
    });
  } catch (error) { next(error); }
};

// GET /api/v1/admin/users/:id
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user || user.role === 'admin') {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const [dreams, goals, milestones, actions, dreamTimes, focusSessions, achievements, counts] = await Promise.all([
      Dream.find({ user: user._id }).sort({ createdAt: -1 }),
      Goal.find({ user: user._id }).sort({ createdAt: -1 }),
      Milestone.find({ user: user._id }).sort({ createdAt: -1 }),
      Action.find({ user: user._id }).sort({ createdAt: -1 }),
      DreamTime.find({ user: user._id }).sort({ createdAt: -1 }),
      FocusSession.find({ user: user._id }).sort({ createdAt: -1 }),
      Achievement.find({ user: user._id }).sort({ createdAt: -1 }),
      countsForUser(user._id)
    ]);

    res.json({
      success: true,
      user: {
        ...user.toJSON(),
        status: userStatus(user),
        ...counts,
        milestoneCount: milestones.length,
        dreamTimeCount: dreamTimes.length,
        focusCount: focusSessions.length,
        achievementCount: achievements.length
      },
      dreams,
      goals,
      milestones,
      actions,
      dreamTimes,
      focusSessions,
      achievements
    });
  } catch (error) { next(error); }
};

// PATCH /api/v1/admin/users/:id/ban
exports.banUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role === 'admin') {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.bannedAt = new Date();
    user.isActive = false;
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'User banned',
      user: { ...user.toJSON(), status: userStatus(user) }
    });
  } catch (error) { next(error); }
};

// PATCH /api/v1/admin/users/:id/unban
exports.unbanUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role === 'admin') {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.bannedAt = null;
    user.isActive = true;
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'User unbanned',
      user: { ...user.toJSON(), status: userStatus(user) }
    });
  } catch (error) { next(error); }
};

// DELETE /api/v1/admin/users/:id
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role === 'admin') {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const uid = user._id;
    await Promise.all([
      Dream.deleteMany({ user: uid }),
      Goal.deleteMany({ user: uid }),
      Milestone.deleteMany({ user: uid }),
      Action.deleteMany({ user: uid }),
      DreamTime.deleteMany({ user: uid }),
      FocusSession.deleteMany({ user: uid }),
      Achievement.deleteMany({ user: uid }),
      User.deleteOne({ _id: uid })
    ]);

    res.json({ success: true, message: 'User and related data deleted' });
  } catch (error) { next(error); }
};

// GET /api/v1/admin/dreams
exports.getDreams = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 15));
    const status = (req.query.status || '').trim();

    const filter = {};
    if (status && ['active', 'completed', 'paused'].includes(status)) {
      filter.status = status;
    }

    const [dreams, total] = await Promise.all([
      Dream.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('user', 'name email'),
      Dream.countDocuments(filter)
    ]);

    res.json({
      success: true,
      dreams,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1
      }
    });
  } catch (error) { next(error); }
};

// GET /api/v1/admin/logs
exports.getLogs = async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const [signups, dreams] = await Promise.all([
      User.find({ role: { $ne: 'admin' } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('name email createdAt'),
      Dream.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('user', 'name email')
        .select('title category status createdAt user')
    ]);

    res.json({
      success: true,
      logs: {
        signups: signups.map((u) => ({
          type: 'signup',
          user: { name: u.name, email: u.email },
          timestamp: u.createdAt
        })),
        dreams: dreams.map((d) => ({
          type: 'dream_created',
          title: d.title,
          category: d.category,
          status: d.status,
          user: d.user,
          timestamp: d.createdAt
        }))
      }
    });
  } catch (error) { next(error); }
};
