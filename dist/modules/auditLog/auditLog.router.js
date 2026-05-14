"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const auditLog_controller_1 = require("./auditLog.controller");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticate, auditLog_controller_1.getAuditLogs);
exports.default = router;
//# sourceMappingURL=auditLog.router.js.map