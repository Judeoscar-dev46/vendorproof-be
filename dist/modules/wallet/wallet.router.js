"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const wallet_controller_1 = require("./wallet.controller");
const router = (0, express_1.Router)();
router.get('/owner/:ownerId', auth_1.authenticate, wallet_controller_1.getWalletByOwner);
router.get('/:id', auth_1.authenticate, wallet_controller_1.getWalletDetails);
router.post('/', auth_1.authenticate, wallet_controller_1.createWallet);
exports.default = router;
//# sourceMappingURL=wallet.router.js.map