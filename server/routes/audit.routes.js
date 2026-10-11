const express = require('express');
const router = express.Router();
const {
  createAudit,
  updateAuditCounts,
  submitAudit,
  getAudits,
  getAuditById,
  approveAudit,
  rejectAudit,
  recountAudit
} = require('../controllers/audit.controller');

const { protect, requireCompany, authorize } = require('../middleware/auth.middleware');

router.use(protect);
router.use(requireCompany);

router.route('/')
  .post(createAudit)
  .get(getAudits);

router.route('/:id')
  .get(getAuditById);

router.route('/:id/count')
  .put(updateAuditCounts);

router.route('/:id/submit')
  .post(submitAudit);

router.route('/:id/recount')
  .post(recountAudit);

// Manager / Admin only routes
router.use(authorize('COMPANY_ADMIN', 'ADMIN', 'MANAGER'));

router.route('/:id/approve')
  .post(approveAudit);

router.route('/:id/reject')
  .post(rejectAudit);

module.exports = router;
