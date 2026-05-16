import axios from 'axios';
import { env } from '../config/env';

export interface FaceMatchResult {
    match: boolean;
    score: number;
    verdict: 'matched' | 'review' | 'mismatch' | 'unclear';
    detail: string;
}

const SIDE_CAR_URL = env.FACE_AI_SIDECAR_URL || 'http://localhost:8000';

export async function matchFace(idBase64: string, selfieBase64: string): Promise<FaceMatchResult> {
    try {
        const response = await axios.post(`${SIDE_CAR_URL}/compare`, {
            id_image: idBase64,
            selfie_image: selfieBase64
        }, {
            timeout: 15000
        });

        return response.data;
    } catch (err: any) {
        console.error('Face Analysis Error:', err.response?.data || err.message);
        return {
            match: false,
            score: 0,
            verdict: 'unclear',
            detail: 'Face analysis service unreachable or failed.'
        };
    }
}
