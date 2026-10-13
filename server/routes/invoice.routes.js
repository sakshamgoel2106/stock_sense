const express = require('express');
const router = express.Router();
const {
  getInvoices,
  getAllPayments,
  getInvoiceStats,
  getInvoiceById,
  createInvoice,
  createInvoiceFromDelivery,
  updateInvoice,
  recordPayment,
  updateInvoiceStatus
} = require('../controllers/invoice.controller');

const { protect, requireCompany, authorize } = require('../middleware/auth.middleware');

router.use(protect);
router.use(requireCompany);

router.get('/stats', getInvoiceStats);
router.get('/payments/all', getAllPayments);
router.get('/', getInvoices);
router.post('/', authorize('COMPANY_ADMIN', 'ADMIN', 'MANAGER'), createInvoice);
router.post('/from-delivery/:operationId', authorize('COMPANY_ADMIN', 'ADMIN', 'MANAGER', 'WORKER'), createInvoiceFromDelivery);
router.get('/:id', getInvoiceById);
router.put('/:id', authorize('COMPANY_ADMIN', 'ADMIN', 'MANAGER'), updateInvoice);
router.post('/:id/payment', authorize('COMPANY_ADMIN', 'ADMIN', 'MANAGER'), recordPayment);
router.put('/:id/status', authorize('COMPANY_ADMIN', 'ADMIN', 'MANAGER'), updateInvoiceStatus);

module.exports = router;
