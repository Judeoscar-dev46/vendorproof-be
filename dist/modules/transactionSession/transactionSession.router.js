"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const transactionSession_controller_1 = require("./transactionSession.controller");
const router = (0, express_1.Router)();
router.post('/', auth_1.authenticate, transactionSession_controller_1.createSession);
router.post('/:sessionCode/join', auth_1.authenticate, transactionSession_controller_1.joinSession);
router.post('/:sessionCode/verify', auth_1.authenticate, transactionSession_controller_1.uploadVerificationFiles, transactionSession_controller_1.submitVerification);
router.post('/:sessionCode/consent', auth_1.authenticate, transactionSession_controller_1.giveConsent);
router.get('/:sessionCode/status', transactionSession_controller_1.getSessionStatus);
// Guest Routes
router.get('/:sessionCode/details', transactionSession_controller_1.getDetails);
router.post('/:sessionCode/join-guest', transactionSession_controller_1.joinAsGuest);
router.post('/:sessionCode/verify-guest', transactionSession_controller_1.uploadVerificationFiles, transactionSession_controller_1.submitVerificationAsGuest);
router.post('/:sessionCode/consent-guest', transactionSession_controller_1.giveConsentAsGuest);
exports.default = router;
//# sourceMappingURL=transactionSession.router.js.map