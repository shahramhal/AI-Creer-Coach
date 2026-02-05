// apps/backend/src/routes/ml.routes.ts
import { Router } from 'express';
import type { Request, Response, RequestHandler } from 'express';
import multer from 'multer';
import mongoose from 'mongoose'; // Added for direct MongoDB access
import { authenticate } from '../middlewares/auth.middleware.js';
import { prisma } from '../config/database.js';
import fs from 'fs';
import path from 'path';

const router = Router();
const upload = multer();

// Ensure the URL has the protocol (http://)
const ML_SERVICE_URL = process.env.ML_SERVICE_URL?.startsWith('http')
  ? process.env.ML_SERVICE_URL
  : `http://${process.env.ML_SERVICE_URL || 'ml-service:8000'}`;

/**
 * Upload and parse CV
 * * Flow:
 * 1. Upload to ML Service for parsing
 * 2. Save file to disk
 * 3. Save metadata to PostgreSQL (Prisma)
 * 4. SYNC parsed data to MongoDB (for Matching Service)
 */
router.post(
  '/parse-cv', 
  authenticate as RequestHandler,
  upload.single('file') as RequestHandler, 
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate file upload
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
        return;
      }

      const userId = req.user!.id;
      const filename = req.file.originalname;

      console.log(`📝 Processing CV: ${filename} for user: ${userId}`);

      // Step 1: Forward to ML service for parsing
      const formData = new FormData();
      const fileBlob = new Blob([new Uint8Array(req.file.buffer)], { 
        type: req.file.mimetype 
      });
      formData.append('file', fileBlob, filename);

      console.log(`🚀 Forwarding to ML service: ${ML_SERVICE_URL}/api/ml/parse-cv`);
      
      const authHeader = req.headers.authorization;
      const mlResponse = await fetch(`${ML_SERVICE_URL}/api/ml/parse-cv`, {
        method: 'POST',
        body: formData,
        headers: authHeader ? { 'Authorization': authHeader } : {},
      });

      const mlData = await mlResponse.json();

      if (!mlResponse.ok) {
        console.error('❌ ML service error:', mlData);
        res.status(mlResponse.status).json({
          success: false,
          message: mlData.message || 'ML service error',
          error: mlData.error
        });
        return;
      }

      const parsedData = mlData.data;
      console.log('✅ CV parsed successfully by ML Service');

      // Step 2: Save File to Disk
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'cvs', userId);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, req.file.buffer);
      console.log(`💾 File saved to disk: ${filePath}`);

      // Step 3: Save to PostgreSQL (Prisma)
      // This is what the Frontend uses to list CVs
      const cvRecord = await prisma.cV.create({
        data: {
          userId: userId,
          filename: filename,
          fileUrl: `/uploads/cvs/${userId}/${filename}`,
          parsedData: parsedData, // Stores JSON in Postgres too
          isPrimary: true,        // Auto-set as primary
        },
      });

      console.log(`💾 Saved to PostgreSQL with ID: ${cvRecord.id}`);

      // Step 4: SYNC TO MONGODB (Critical for Matching)
      // The Matching Controller looks in MongoDB 'parsed_cvs' collection.
      // We manually insert the data here to ensure it exists and links to the Postgres ID.
      try {
        if (mongoose.connection.readyState === 1) {
            const db = mongoose.connection.db;
            if (db) {
                const mongoCollection = db.collection('parsed_cvs');
                
                // Cleanup: Remove old parsed CVs for this user so the matcher doesn't get confused
                await mongoCollection.deleteMany({ user_id: userId });

                // Insert the new record
                await mongoCollection.insertOne({
                    user_id: userId,
                    cv_id: cvRecord.id, // LINK TO POSTGRES ID
                    filename: filename,
                    contact_info: parsedData.contact_info,
                    skills: parsedData.skills,
                    experience: parsedData.experience,
                    education: parsedData.education,
                    summary: parsedData.summary,
                    // IMPORTANT: Ensure raw_text is top-level for the matcher
                    raw_text: parsedData.raw_text || parsedData.full_text || parsedData.text || "",
                    metadata: { 
                        raw_text: parsedData.raw_text || parsedData.full_text 
                    },
                    parsedAt: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                console.log('✅ Synchronized to MongoDB (parsed_cvs) for Matching Service');
            }
        } else {
            console.warn('⚠️ MongoDB not connected! Matching service might fail to find this CV.');
        }
      } catch (mongoErr) {
        console.error('❌ Failed to sync to MongoDB:', mongoErr);
        // We don't fail the request here, but matching might fail later
      }

      // Return success response
      res.status(200).json({
        success: true,
        message: 'CV parsed and saved successfully',
        data: {
          cvId: cvRecord.id,
          filename: cvRecord.filename,
          parsedData: cvRecord.parsedData,
          createdAt: cvRecord.createdAt,
        }
      });

    } catch (error) {
      console.error('❌ Error parsing CV:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to parse CV',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
});

/**
 * Get user's CVs
 */
router.get(
  '/cvs',
  authenticate as RequestHandler,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const cvs = await prisma.cV.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          filename: true,
          parsedData: true,
          isPrimary: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json({
        success: true,
        data: cvs,
        count: cvs.length,
      });

    } catch (error) {
      console.error('Error fetching CVs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch CVs',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
});

/**
 * Get specific CV by ID
 */
router.get(
  '/cvs/:cvId',
  authenticate as RequestHandler,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const cvId = req.params.cvId;

      if (!cvId) {
        res.status(400).json({ success: false, message: 'CV ID is required' });
        return;
      }

      const cv = await prisma.cV.findUnique({
        where: { id: cvId },
      });

      if (!cv || cv.userId !== userId) {
        res.status(404).json({ success: false, message: 'CV not found' });
        return;
      }

      res.json({ success: true, data: cv });

    } catch (error) {
      console.error('Error fetching CV:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch CV' });
    }
});

/**
 * Delete CV
 */
router.delete(
  '/cvs/:cvId',
  authenticate as RequestHandler,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const cvId = req.params.cvId;

      if (!cvId) {
        res.status(400).json({ success: false, message: 'CV ID is required' });
        return;
      }

      const cv = await prisma.cV.findUnique({ where: { id: cvId } });

      if (!cv || cv.userId !== userId) {
        res.status(404).json({ success: false, message: 'CV not found' });
        return;
      }

      // Delete from Postgres
      await prisma.cV.delete({ where: { id: cvId } });

      // Clean up from MongoDB as well
      try {
         if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
             await mongoose.connection.db.collection('parsed_cvs').deleteOne({ cv_id: cvId });
             console.log(`🗑️ Deleted CV ${cvId} from MongoDB`);
         }
      } catch (e) {
         console.warn("Could not cleanup MongoDB record:", e);
      }

      res.json({ success: true, message: 'CV deleted successfully' });

    } catch (error) {
      console.error('Error deleting CV:', error);
      res.status(500).json({ success: false, message: 'Failed to delete CV' });
    }
});

/**
 * Set primary CV
 */
router.patch(
  '/cvs/:cvId/primary',
  authenticate as RequestHandler,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const cvId = req.params.cvId;

      if (!cvId) {
        res.status(400).json({ success: false, message: 'CV ID is required' });
        return;
      }

      const cv = await prisma.cV.findUnique({ where: { id: cvId } });

      if (!cv || cv.userId !== userId) {
        res.status(404).json({ success: false, message: 'CV not found' });
        return;
      }

      await prisma.cV.updateMany({
        where: { userId },
        data: { isPrimary: false },
      });

      const updatedCv = await prisma.cV.update({
        where: { id: cvId },
        data: { isPrimary: true },
      });

      res.json({ success: true, message: 'Primary CV updated', data: updatedCv });

    } catch (error) {
      console.error('Error setting primary CV:', error);
      res.status(500).json({ success: false, message: 'Failed to set primary CV' });
    }
});

/**
 * Download CV
 */
router.get('/cvs/:cvId/download', authenticate as RequestHandler,
   async (req: Request, res: Response): Promise<void> => {
    try {
      const { cvId } = req.params;
      const userId = req.user!.id;
      
      if (!cvId) {
        res.status(400).json({ success: false, message: 'CV ID is required' });
        return;
      }
      
      const cv = await prisma.cV.findUnique({ where: { id: cvId } });
      if (!cv || cv.userId !== userId) {
        res.status(404).json({ success: false, message: 'CV not found' });
        return;
      }
      
      const filePath = path.join(process.cwd(), 'public', cv.fileUrl);
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ success: false, message: 'File not found on server' });
        return;
      }

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      fileStream.on('error', (error) => {
        console.error('Stream error:', error);
        if (!res.headersSent) res.status(500).json({ success: false, message: 'Error streaming file' });
      });

    } catch (error) {
      console.error('Download error:', error);
      if (!res.headersSent) res.status(500).json({ success: false, message: 'Failed to download CV' });
    }
});

/**
 * Health check for ML service
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