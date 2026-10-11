const express = require('express');
const router = express.Router();
const {
  getWarehouses,
  createWarehouse,
  createWarehousesBulk,
  getWarehouseById,
  updateWarehouse,
  deleteWarehouse
} = require('../controllers/warehouse.controller');
const { protect, requireCompany, authorize } = require('../middleware/auth.middleware');

router.use(protect);
router.use(requireCompany);

router.route('/')
  .get(getWarehouses)
  .post(authorize('COMPANY_ADMIN', 'ADMIN'), createWarehouse);

router.route('/bulk')
  .post(authorize('COMPANY_ADMIN', 'ADMIN'), createWarehousesBulk);

router.route('/:id')
  .get(getWarehouseById)
  .put(authorize('COMPANY_ADMIN', 'ADMIN'), updateWarehouse)
  .delete(authorize('COMPANY_ADMIN', 'ADMIN'), deleteWarehouse);

module.exports = router;
