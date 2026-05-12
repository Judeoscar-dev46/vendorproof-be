"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
router.post('/register', auth_1.optionalAuthenticate, auth_controller_1.registerAdmin);
router.post('/login', auth_controller_1.login);
exports.default = router;
//# sourceMappingURL=auth.router.js.map