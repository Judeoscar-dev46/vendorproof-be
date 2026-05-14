"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const verificationRequest_controller_1 = require("./verificationRequest.controller");
const router = (0, express_1.Router)();
// Institution: create, list or approve verification requests
router.post('/', auth_1.authenticate, verificationRequest_controller_1.createRequest);
router.get('/', auth_1.authenticate, verificationRequest_controller_1.getAllRequests);
router.get('/:requestCode', auth_1.authenticate, verificationRequest_controller_1.getRequestDetailsForInstitution);
router.patch('/:requestCode/approve', auth_1.authenticate, verificationRequest_controller_1.approveRequest);
// Institution: poll request status
router.get('/:requestCode/status', auth_1.authenticate, verificationRequest_controller_1.getRequestStatus);
// Vendor: join, decline, or submit documents for a request
router.post('/:requestCode/join', auth_1.authenticate, verificationRequest_controller_1.joinRequest);
router.post('/:requestCode/decline', auth_1.authenticate, verificationRequest_controller_1.declineRequest);
router.post('/:requestCode/submit', auth_1.authenticate, verificationRequest_controller_1.uploadDocument, verificationRequest_controller_1.submitVerification);
// Guest Flow (no auth required)
router.get('/guest/:requestCode', verificationRequest_controller_1.getDetails);
router.post('/guest/:requestCode/join', verificationRequest_controller_1.joinRequestGuest);
router.post('/guest/:requestCode/submit', verificationRequest_controller_1.uploadDocument, verificationRequest_controller_1.submitVerificationGuest);
router.post('/guest/:requestCode/convert', verificationRequest_controller_1.convertGuestAccount);
exports.default = router;
//# sourceMappingURL=verificationRequest.router.js.map