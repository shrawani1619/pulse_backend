const express = require('express');
const router = express.Router();

router.use('/auth', require('./authRoutes'));
router.use('/dreams', require('./dreamRoutes'));
router.use('/goals', require('./goalRoutes'));
router.use('/milestones', require('./milestoneRoutes'));
router.use('/actions', require('./actionRoutes'));
router.use('/dream-time', require('./dreamTimeRoutes'));
router.use('/focus', require('./focusRoutes'));
router.use('/stats', require('./statsRoutes'));
router.use('/achievements', require('./achievementRoutes'));
router.use('/insights', require('./insightsRoutes'));

module.exports = router;
