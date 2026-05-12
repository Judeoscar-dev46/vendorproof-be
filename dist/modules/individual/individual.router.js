"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const individual_controller_1 = require("./individual.controller");
const router = (0, express_1.Router)();
router.post('/', individual_controller_1.createProfile);
router.get('/:id', auth_1.authenticate, individual_controller_1.getProfile);
router.patch('/:id', auth_1.authenticate, individual_controller_1.updateProfile);
exports.default = router;
//# sourceMappingURL=individual.router.js.map