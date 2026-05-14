import base64
import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import insightface
from insightface.app import FaceAnalysis
import uvicorn

app = FastAPI(title="VendorProof Face AI Sidecar")

# Initialize InsightFace
# This will download the models on first run (~400MB)
handler = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
handler.prepare(ctx_id=0, det_size=(640, 640))

class CompareRequest(BaseModel):
    id_image: str  # base64 string
    selfie_image: str # base64 string

def decode_image(b64_string):
    try:
        # Strip header if present
        if "," in b64_string:
            b64_string = b64_string.split(",")[1]
        img_data = base64.b64decode(b64_string)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Failed to decode image")
        return img
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")

@app.get("/health")
async def health():
    return {"status": "ready", "model": "buffalo_l"}

@app.post("/compare")
async def compare_faces(request: CompareRequest):
    img1 = decode_image(request.id_image)
    img2 = decode_image(request.selfie_image)

    # Detect faces and generate embeddings
    faces1 = handler.get(img1)
    faces2 = handler.get(img2)

    if len(faces1) == 0:
        return {
            "match": False, 
            "score": 0, 
            "verdict": "unclear",
            "detail": "No face detected in ID document"
        }
    if len(faces2) == 0:
        return {
            "match": False, 
            "score": 0, 
            "verdict": "unclear",
            "detail": "No face detected in selfie. Ensure your face is clearly visible."
        }

    # Take the largest (most prominent) face in each image
    face1 = sorted(faces1, key=lambda x: (x.bbox[2]-x.bbox[0])*(x.bbox[3]-x.bbox[1]), reverse=True)[0]
    face2 = sorted(faces2, key=lambda x: (x.bbox[2]-x.bbox[0])*(x.bbox[3]-x.bbox[1]), reverse=True)[0]

    # Compute cosine similarity between embeddings
    # embeddings are already normalized by InsightFace
    feat1 = face1.normed_embedding
    feat2 = face2.normed_embedding
    sim = np.dot(feat1, feat2)
    
    # Scale similarity to a 0-100 range for the business logic
    # InsightFace cosine similarity: > 0.4 is generally a match, > 0.6 is very strong
    score = float(sim) * 100
    
    verdict = "mismatch"
    if score > 45:
        verdict = "matched"
    elif score > 30:
        verdict = "review"

    return {
        "match": score > 45,
        "score": round(max(0, min(100, score)), 2),
        "verdict": verdict,
        "detail": f"Face match confidence: {score:.2f}%"
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
