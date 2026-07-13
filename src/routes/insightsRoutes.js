const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getInsightsBundle, getAnalytics } = require('../services/insightsService');

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const data = await getInsightsBundle(req.user._id);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

router.get('/nudges', async (req, res, next) => {
  try {
    const data = await getInsightsBundle(req.user._id);
    res.json({ success: true, data: data.nudges });
  } catch (e) { next(e); }
});

router.get('/analytics', async (req, res, next) => {
  try {
    const data = await getAnalytics(req.user._id);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

module.exports = router;
