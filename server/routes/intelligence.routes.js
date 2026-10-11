const express = require('express');
const router = express.Router();
const {
  getOverview,
  getRecommendations,
  getProductForecast,
  getTransfers,
  proposeTransfer,
  simulateScenario,
  copilotChat
} = require('../controllers/intelligence.controller');

const { protect, requireCompany } = require('../middleware/auth.middleware');

router.use(protect);
router.use(requireCompany);

router.get('/overview', getOverview);
router.get('/recommendations', getRecommendations);
router.get('/forecast/:productId', getProductForecast);
router.get('/transfers', getTransfers);
router.post('/transfers/propose', proposeTransfer);
router.post('/simulate', simulateScenario);
router.post('/copilot/chat', copilotChat);

module.exports = router;
