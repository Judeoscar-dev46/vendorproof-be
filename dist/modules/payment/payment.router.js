"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payment_controller_1 = require("./payment.controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
router.get('/banks', auth_1.authenticate, payment_controller_1.getBanks);
router.post('/webhook', payment_controller_1.handleSquadWebhook);
router.post('/release', auth_1.authenticate, payment_controller_1.initiatePayment);
router.post('/verify-payment', auth_1.authenticate, payment_controller_1.uploadDocument, payment_controller_1.verifyPayment);
router.post('/analyse-screenshot', auth_1.authenticate, payment_controller_1.uploadDocument, payment_controller_1.analyseScreenshot);
router.get('/status/:verificationId', auth_1.authenticate, payment_controller_1.getPaymentStatus);
router.get('/vendor/:vendorId', auth_1.authenticate, payment_controller_1.getVendorPayments);
exports.default = router;
//# sourceMappingURL=payment.router.js.map