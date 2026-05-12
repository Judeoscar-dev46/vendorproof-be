"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const vendor_controller_1 = require("./vendor.controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
router.post('/', auth_1.authenticate, vendor_controller_1.createVendor);
router.get('/', auth_1.authenticate, vendor_controller_1.getAllVendors);
router.get('/:id', auth_1.authenticate, vendor_controller_1.getVendor);
router.patch('/:id/status', auth_1.authenticate, (0, auth_1.requireRole)('admin', 'officer'), vendor_controller_1.updateVendorStatus);
router.delete('/:id', auth_1.authenticate, (0, auth_1.requireRole)('admin'), vendor_controller_1.deleteVendor);
exports.default = router;
//# sourceMappingURL=vendor.router.js.map