// apps/backend/src/routes/ml.routes.ts
import { Router } from 'express';
import type { Request, Response, RequestHandler } from 'express';
import multer from 'multer';

const router = Router();
const upload = multer();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:8000';

/**
 * Proxy route for CV parsing
 * Forwards multipart/form-data requests to ML service
 */
router.post('/parse-cv', upload.single('file') as RequestHandler, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
      return;
    }

    // Create FormData for ML service request
    const formData = new FormData();
    const fileBlob = new Blob([new Uint8Array(req.file.buffer)], { type: req.file.mimetype });
    formData.append('file', fileBlob, req.file.originalname);

    console.log(`Forwarding CV parse request to ML service: ${ML_SERVICE_URL}/api/ml/parse-cv`);

    // Forward request to ML service
    const mlResponse = await fetch(`${ML_SERVICE_URL}/api/ml/parse-cv`, {
      method: 'POST',
      body: formData,
    });

    const responseData = await mlResponse.json();

    if (!mlResponse.ok) {
      res.status(mlResponse.status).json({
        success: false,
        message: responseData.message || 'ML service error',
        error: responseData.error
      });
      return;
    }

    res.status(200).json(responseData);
  } catch (error) {
    console.error('Error proxying to ML service:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to communicate with ML service',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Health check proxy for ML service
 */
router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    const mlResponse = await fetch(`${ML_SERVICE_URL}/health`, {
      method: 'GET',
    });

    const responseData = await mlResponse.json();
    res.status(mlResponse.status).json(responseData);
  } catch (error) {
    console.error('ML service health check failed:', error);
    res.status(503).json({
      success: false,
      message: 'ML service unavailable',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
