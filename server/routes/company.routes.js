const express = require('express');
const router = express.Router();
const {
  createCompany,
  getCurrentCompany,
  updateCompanySettings,
  getCompanyMembers,
  updateMemberRole,
  updateMemberWarehouses,
  updateMemberStatus,
  removeMember,
  addMemberDirect,
  requestMemberRemoval,
  approveMemberRemoval,
  rejectMemberRemoval,
  createInvitation,
  getInvitations,
  revokeInvitation,
  acceptInvitation
} = require('../controllers/company.controller');

const { protect, requireCompany, authorize } = require('../middleware/auth.middleware');

router.use(protect);

// Public onboarding routes for authenticated user
router.post('/', createCompany);
router.post('/invitations/accept', acceptInvitation);

// Routes requiring active company membership
router.use(requireCompany);

router.route('/current')
  .get(getCurrentCompany)
  .put(authorize('COMPANY_ADMIN'), updateCompanySettings);

router.route('/members')
  .get(authorize('COMPANY_ADMIN', 'MANAGER'), getCompanyMembers);

router.post('/members/direct', authorize('COMPANY_ADMIN'), addMemberDirect);

router.route('/members/:id/role')
  .put(authorize('COMPANY_ADMIN'), updateMemberRole);

router.route('/members/:id/warehouses')
  .put(authorize('COMPANY_ADMIN'), updateMemberWarehouses);

router.route('/members/:id/status')
  .put(authorize('COMPANY_ADMIN'), updateMemberStatus);

// Removal request & approval routes
router.post('/members/:id/request-removal', authorize('COMPANY_ADMIN', 'MANAGER'), requestMemberRemoval);
router.post('/members/:id/approve-removal', authorize('COMPANY_ADMIN'), approveMemberRemoval);
router.post('/members/:id/reject-removal', authorize('COMPANY_ADMIN'), rejectMemberRemoval);

router.route('/members/:id')
  .delete(authorize('COMPANY_ADMIN'), removeMember);

router.route('/invitations')
  .post(authorize('COMPANY_ADMIN'), createInvitation)
  .get(authorize('COMPANY_ADMIN', 'MANAGER'), getInvitations);

router.route('/invitations/:id')
  .delete(authorize('COMPANY_ADMIN'), revokeInvitation);

module.exports = router;
