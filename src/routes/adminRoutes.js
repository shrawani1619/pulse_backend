const express = require('express');
const router = express.Router();
const { adminProtect } = require('../middleware/adminAuth');
const {
  getStats,
  getUsers,
  getUserById,
  banUser,
  unbanUser,
  deleteUser,
  getDreams,
  getLogs
} = require('../controllers/adminController');

router.use(...adminProtect);

router.get('/stats', getStats);
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id/ban', banUser);
router.patch('/users/:id/unban', unbanUser);
router.delete('/users/:id', deleteUser);
router.get('/dreams', getDreams);
router.get('/logs', getLogs);

module.exports = router;
