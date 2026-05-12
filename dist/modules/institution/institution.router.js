"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const institution_controller_1 = require("./institution.controller");
const router = (0, express_1.Router)();
router.post('/', institution_controller_1.createProfile);
router.get('/dashboard', auth_1.authenticate, institution_controller_1.getDashboard);
router.get('/:id', auth_1.authenticate, institution_controller_1.getProfile);
router.patch('/:id', auth_1.authenticate, institution_controller_1.updateProfile);
router.get('/:id/requests', auth_1.authenticate, institution_controller_1.getVerificationRequests);
exports.default = router;
//# sourceMappingURL=institution.router.js.map