import { Router } from 'express';
import type { RequestHandler } from 'express';
import multer from 'multer';
import { authenticate } from '../middlewares/auth.middleware.js';
import { parseCv, getCVs, getCVById, deleteCV, setPrimaryCV, downloadCV, analyzeCV, healthCheck } from '../controllers/ml.controller.js';

const router = Router();
const upload = multer();

router.post('/parse-cv', authenticate as RequestHandler, upload.single('file') as RequestHandler, parseCv as RequestHandler);
router.get('/cvs', authenticate as RequestHandler, getCVs as RequestHandler);
router.get('/cvs/:cvId', authenticate as RequestHandler, getCVById as RequestHandler);
router.delete('/cvs/:cvId', authenticate as RequestHandler, deleteCV as RequestHandler);
router.patch('/cvs/:cvId/primary', authenticate as RequestHandler, setPrimaryCV as RequestHandler);
router.get('/cvs/:cvId/download', authenticate as RequestHandler, downloadCV as RequestHandler);
router.post('/cvs/:cvId/analyze', authenticate as RequestHandler, analyzeCV as RequestHandler);
router.get('/health', healthCheck as RequestHandler);

export default router;
