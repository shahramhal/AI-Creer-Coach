import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middlewares/auth.middleware.js';
import { parseCv, getCVs, getCVById, deleteCV, setPrimaryCV, downloadCV, analyzeCV, healthCheck } from '../controllers/ml.controller.js';

const router = Router();
const upload = multer();

router.post('/parse-cv', authenticate, upload.single('file'), parseCv);
router.get('/cvs', authenticate, getCVs);
router.get('/cvs/:cvId', authenticate, getCVById);
router.delete('/cvs/:cvId', authenticate, deleteCV);
router.patch('/cvs/:cvId/primary', authenticate, setPrimaryCV);
router.get('/cvs/:cvId/download', authenticate, downloadCV);
router.post('/cvs/:cvId/analyze', authenticate, analyzeCV);
router.get('/health', healthCheck);

export default router;
