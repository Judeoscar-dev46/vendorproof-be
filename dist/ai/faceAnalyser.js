"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchFace = matchFace;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
const SIDE_CAR_URL = env_1.env.FACE_AI_SIDECAR_URL || 'http://localhost:8000';
async function matchFace(idBase64, selfieBase64) {
    try {
        const response = await axios_1.default.post(`${SIDE_CAR_URL}/compare`, {
            id_image: idBase64,
            selfie_image: selfieBase64
        }, {
            timeout: 15000
        });
        return response.data;
    }
    catch (err) {
        console.log(err);
        console.error('Face Analysis Error:', err.response?.data || err.message);
        return {
            match: false,
            score: 0,
            verdict: 'unclear',
            detail: 'Face analysis service unreachable or failed.'
        };
    }
}
//# sourceMappingURL=faceAnalyser.js.map