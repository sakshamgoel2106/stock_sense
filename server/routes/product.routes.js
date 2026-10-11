const express = require('express');
const router = express.Router();
const {
  getProducts,
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct
} = require('../controllers/product.controller');
const { protect, requireCompany, authorize } = require('../middleware/auth.middleware');

router.use(protect);
router.use(requireCompany);

router.route('/')
  .get(getProducts)
  .post(authorize('COMPANY_ADMIN', 'ADMIN', 'MANAGER'), createProduct);

router.route('/:id')
  .get(getProductById)
  .put(authorize('COMPANY_ADMIN', 'ADMIN', 'MANAGER'), updateProduct)
  .delete(authorize('COMPANY_ADMIN', 'ADMIN'), deleteProduct);

module.exports = router;
