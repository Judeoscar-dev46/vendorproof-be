"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreAnomaly = scoreAnomaly;
function scoreAnomaly(vendor, invoiceAmount) {
    let totalPenalty = 0;
    const flags = [];
    const penalties = [];
    const applyPenalty = (rule, penalty, flag) => {
        totalPenalty += penalty;
        flags.push(flag);
        penalties.push({ rule, penalty });
    };
    // Rule 1: RC number format validation (Nigerian CAC format: RC + 6 digits)
    const rcPattern = /^RC\d{6}$/i;
    if (!rcPattern.test(vendor.rcNumber)) {
        applyPenalty('invalid_rc_format', 30, `RC number "${vendor.rcNumber}" does not match Nigerian CAC format`);
    }
    // Rule 2: Days between registration and first invoice
    const regDate = new Date(vendor.registrationDate);
    const daysSinceReg = Math.floor((Date.now() - regDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceReg < 30) {
        applyPenalty('very_new_vendor', 25, `Vendor registered only ${daysSinceReg} days ago`);
    }
    else if (daysSinceReg < 90) {
        applyPenalty('new_vendor', 10, `Vendor registered ${daysSinceReg} days ago — relatively new`);
    }
    // Rule 3: Suspiciously round invoice amounts (common in fraud)
    if (invoiceAmount) {
        const isRoundMillion = invoiceAmount % 1_000_000 === 0 && invoiceAmount >= 1_000_000;
        const isRoundHundredK = invoiceAmount % 100_000 === 0 && invoiceAmount >= 500_000;
        if (isRoundMillion) {
            applyPenalty('round_million_amount', 20, `Invoice amount ₦${invoiceAmount.toLocaleString()} is a suspiciously round figure`);
        }
        else if (isRoundHundredK) {
            applyPenalty('round_amount', 10, `Invoice amount ₦${invoiceAmount.toLocaleString()} is a round figure`);
        }
    }
    // Rule 4: BVN format (11 digits)
    const bvnPattern = /^\d{11}$/;
    if (!bvnPattern.test(vendor.directorBvn)) {
        applyPenalty('invalid_bvn_format', 25, `BVN "${vendor.directorBvn}" does not match expected 11-digit format`);
    }
    const score = Math.max(0, 100 - totalPenalty);
    return { score, flags, penalties };
}
//# sourceMappingURL=anomalyScorer.js.map