"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("./config/env");
const errorHandler_1 = require("./middleware/errorHandler");
const expireStaleRecords_1 = require("./jobs/expireStaleRecords");
const auth_router_1 = __importDefault(require("./modules/auth/auth.router"));
const vendor_router_1 = __importDefault(require("./modules/vendor/vendor.router"));
const verification_router_1 = __importDefault(require("./modules/verification/verification.router"));
const payment_router_1 = __importDefault(require("./modules/payment/payment.router"));
const wallet_router_1 = __importDefault(require("./modules/wallet/wallet.router"));
const individual_router_1 = __importDefault(require("./modules/individual/individual.router"));
const institution_router_1 = __importDefault(require("./modules/institution/institution.router"));
const verificationRequest_router_1 = __importDefault(require("./modules/verificationRequest/verificationRequest.router"));
const transactionSession_router_1 = __importDefault(require("./modules/transactionSession/transactionSession.router"));
const auditLog_router_1 = __importDefault(require("./modules/auditLog/auditLog.router"));
const app = (0, express_1.default)();
app.use((0, morgan_1.default)('dev'));
app.use((0, cors_1.default)({
    origin: '*',
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api/auth', auth_router_1.default);
app.use('/api/vendors', vendor_router_1.default);
app.use('/api/verifications', verification_router_1.default);
app.use('/api/payments', payment_router_1.default);
app.use('/api/wallets', wallet_router_1.default);
app.use('/api/individuals', individual_router_1.default);
app.use('/api/institutions', institution_router_1.default);
app.use('/api/verification-requests', verificationRequest_router_1.default);
app.use('/api/sessions', transactionSession_router_1.default);
app.use('/api/audit-logs', auditLog_router_1.default);
app.use(errorHandler_1.errorHandler);
mongoose_1.default.connect(env_1.env.MONGODB_URI)
    .then(() => {
    console.log('MongoDB connected');
    (0, expireStaleRecords_1.startExpiryJob)();
    app.listen(env_1.env.PORT, () => console.log(`VendorProof API running on port: ${env_1.env.PORT}`));
})
    .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
});
//# sourceMappingURL=app.js.map