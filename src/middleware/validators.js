const { body } = require('express-validator');

exports.registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

exports.loginRules = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];

exports.profileRules = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty')
];

exports.dreamRules = [
  body('title').optional().trim().notEmpty().withMessage('Title is required'),
  body('progress').optional().isInt({ min: 0, max: 100 }).withMessage('Progress must be 0-100'),
  body('status').optional().isIn(['active', 'completed', 'paused']).withMessage('Invalid status'),
  body('category').optional().isIn(['career', 'health', 'relationships', 'finance', 'personal', 'other'])
];

exports.dreamCreateRules = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('progress').optional().isInt({ min: 0, max: 100 }).withMessage('Progress must be 0-100'),
  body('status').optional().isIn(['active', 'completed', 'paused']),
  body('category').optional().isIn(['career', 'health', 'relationships', 'finance', 'personal', 'other'])
];

exports.goalCreateRules = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('dream').notEmpty().withMessage('Dream is required'),
  body('progress').optional().isInt({ min: 0, max: 100 }),
  body('status').optional().isIn(['active', 'completed', 'paused'])
];

exports.goalUpdateRules = [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('progress').optional().isInt({ min: 0, max: 100 }),
  body('status').optional().isIn(['active', 'completed', 'paused'])
];

exports.milestoneCreateRules = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('goal').notEmpty().withMessage('Goal is required'),
  body('progress').optional().isInt({ min: 0, max: 100 }),
  body('status').optional().isIn(['active', 'completed', 'paused'])
];

exports.milestoneUpdateRules = [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('progress').optional().isInt({ min: 0, max: 100 }),
  body('status').optional().isIn(['active', 'completed', 'paused'])
];

exports.actionCreateRules = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('milestone').notEmpty().withMessage('Milestone is required'),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('status').optional().isIn(['pending', 'in_progress', 'completed', 'skipped']),
  body('duration').optional().isInt({ min: 1 })
];

exports.actionUpdateRules = [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('status').optional().isIn(['pending', 'in_progress', 'completed', 'skipped']),
  body('duration').optional().isInt({ min: 1 })
];

exports.dreamTimeCreateRules = [
  body('dream').notEmpty().withMessage('Dream is required'),
  body('date').notEmpty().withMessage('Date is required'),
  body('startTime').notEmpty().withMessage('Start time is required'),
  body('endTime').notEmpty().withMessage('End time is required'),
  body('status').optional().isIn(['planned', 'completed', 'missed'])
];
