const express = require('express');
const router = express.Router();
const { getDreams, createDream, updateDream, deleteDream } = require('../controllers/dreamController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { dreamCreateRules, dreamRules } = require('../middleware/validators');

router.use(protect);
router.route('/').get(getDreams).post(dreamCreateRules, validate, createDream);
router.route('/:id').put(dreamRules, validate, updateDream).delete(deleteDream);

module.exports = router;
