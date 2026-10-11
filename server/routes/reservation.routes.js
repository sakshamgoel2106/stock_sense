const express = require('express');
const router = express.Router();
const {
  createReservation,
  getReservations,
  cancelReservation,
  fulfillReservation
} = require('../controllers/reservation.controller');

const { protect, requireCompany } = require('../middleware/auth.middleware');

router.use(protect);
router.use(requireCompany);

router.route('/')
  .post(createReservation)
  .get(getReservations);

router.route('/:id/cancel')
  .put(cancelReservation);

router.route('/:id/fulfill')
  .put(fulfillReservation);

module.exports = router;
