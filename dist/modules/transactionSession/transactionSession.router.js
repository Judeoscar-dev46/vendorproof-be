"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const transactionSession_controller_1 = require("./transactionSession.controller");
const router = (0, express_1.Router)();
// Initiator: start a new P2P session
router.post('/', auth_1.authenticate, transactionSession_controller_1.createSession);
// Recipient: join an existing session
router.post('/:sessionCode/join', auth_1.authenticate, transactionSession_controller_1.joinSession);
// Both parties: submit identity document
router.post('/:sessionCode/verify', auth_1.authenticate, transactionSession_controller_1.uploadDocument, transactionSession_controller_1.submitVerification);
// Both parties: consent to release payment
router.post('/:sessionCode/consent', auth_1.authenticate, transactionSession_controller_1.giveConsent);
// Both parties: get session status (only shows both scores after both_verified)
router.get('/:sessionCode/status', auth_1.authenticate, transactionSession_controller_1.getSessionStatus);
exports.default = router;
//# sourceMappingURL=transactionSession.router.js.map