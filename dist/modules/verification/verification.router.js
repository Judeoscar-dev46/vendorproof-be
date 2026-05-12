"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const verification_controller_1 = require("./verification.controller");
const auth_1 = require("../../middleware/auth");
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const router = (0, express_1.Router)();
router.post('/', auth_1.authenticate, upload.single('document'), verification_controller_1.submitVerification);
router.get('/:id', auth_1.authenticate, verification_controller_1.getVerification);
exports.default = router;
//# sourceMappingURL=verification.router.js.map