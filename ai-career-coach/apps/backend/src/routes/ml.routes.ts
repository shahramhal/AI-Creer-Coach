// apps/backend/src/routes/ml.routes.ts
import { Router } from 'express';
import type { Request, Response, RequestHandler } from 'express';
import multer from 'multer';
import { authenticate } from '../middlewares/auth.middleware.js';
import { prisma } from '../config/database.js';
import fs from 'fs';
import path from 'path';

const router = Router();
const upload = multer();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:8000';

/**
 * Upload and parse CV
 * Protected route - requires authentication
 * 
 * Flow:
 * 1. User uploads CV file
 * 2. Forward to ML service for parsing
 * 3. Save parsed data to PostgreSQL (CV table)
 * 4. Return parsed data to user
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

      console.log(` Processing CV: ${filename} for user: ${userId}`);

      // Step 1: Create FormData for ML service
      const formData = new FormData();
      const fileBlob = new Blob([new Uint8Array(req.file.buffer)], { 
        type: req.file.mimetype 
      });
      formData.append('file', fileBlob, filename);

      // Step 2: Forward to ML service for parsing
      console.log(` Forwarding to ML service: ${ML_SERVICE_URL}/api/ml/parse-cv`);

      // Pass the Authorization header so ML service knows the user
      const authHeader = req.headers.authorization;

      const mlResponse = await fetch(`${ML_SERVICE_URL}/api/ml/parse-cv`, {
        method: 'POST',
        body: formData,
        headers: authHeader ? { 'Authorization': authHeader } : {},
      });

      const mlData = await mlResponse.json();

      // Handle ML service errors
      if (!mlResponse.ok) {
        console.error(' ML service error:', mlData);
        res.status(mlResponse.status).json({
          success: false,
          message: mlData.message || 'ML service error',
          error: mlData.error
        });
        return;
      }

      // Extract parsed data from ML response
      const parsedData = mlData.data;

      console.log(' CV parsed successfully');

       //SAVE FILE TO DISK
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'cvs', userId);
      
      console.log(` Saving to: ${uploadDir}`);
      
      // Create directory
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Save file
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, req.file.buffer);
      
      console.log(` File saved: ${filePath}`);

      // Verify
      if (!fs.existsSync(filePath)) {
        throw new Error('File save failed');
      }

      // Step 3: Save to PostgreSQL
      // Store parsed data in CV table (parsedData field as JSONB)
      const cvRecord = await prisma.cV.create({
        data: {
          userId: userId,
          filename: filename,
          fileUrl: `/uploads/cvs/${userId}/${filename}`, // Placeholder - implement file storage
          parsedData: parsedData, // Store entire parsed CV as JSON
          isPrimary: false, // User can set primary CV later
        },
      });

      console.log(` Saved to database with ID: ${cvRecord.id}`);

      // Step 4: Return response
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
      console.error(' Error parsing CV:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to parse CV',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
});

/**
 * Get user's CVs
 * Returns all CVs for authenticated user
 */
router.get(
  '/cvs',
  authenticate as RequestHandler,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;

      // Fetch all CVs for user
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

      // Validate cvId parameter exists
      if (!cvId) {
        res.status(400).json({
          success: false,
          message: 'CV ID is required',
        });
        return;
      }

      // Fetch CV and verify ownership
      // Use findUnique with where clause instead of findFirst
      const cv = await prisma.cV.findUnique({
        where: { id: cvId },
      });

      // Verify ownership after fetching
      if (!cv || cv.userId !== userId) {
        res.status(404).json({
          success: false,
          message: 'CV not found',
        });
        return;
      }

      res.json({
        success: true,
        data: cv,
      });

    } catch (error) {
      console.error('Error fetching CV:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch CV',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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

      // Validate cvId parameter exists
      if (!cvId) {
        res.status(400).json({
          success: false,
          message: 'CV ID is required',
        });
        return;
      }

      // Verify ownership before deleting
      const cv = await prisma.cV.findUnique({
        where: { id: cvId },
      });

      if (!cv || cv.userId !== userId) {
        res.status(404).json({
          success: false,
          message: 'CV not found',
        });
        return;
      }

      // Delete CV
      await prisma.cV.delete({
        where: { id: cvId },
      });

      res.json({
        success: true,
        message: 'CV deleted successfully',
      });

    } catch (error) {
      console.error('Error deleting CV:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete CV',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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

      // Validate cvId parameter exists
      if (!cvId) {
        res.status(400).json({
          success: false,
          message: 'CV ID is required',
        });
        return;
      }

      // Verify ownership
      const cv = await prisma.cV.findUnique({
        where: { id: cvId },
      });

      if (!cv || cv.userId !== userId) {
        res.status(404).json({
          success: false,
          message: 'CV not found',
        });
        return;
      }

      // Set all user's CVs to non-primary
      await prisma.cV.updateMany({
        where: { userId },
        data: { isPrimary: false },
      });

      // Set this CV as primary
      const updatedCv = await prisma.cV.update({
        where: { id: cvId },
        data: { isPrimary: true },
      });

      res.json({
        success: true,
        message: 'Primary CV updated',
        data: updatedCv,
      });

    } catch (error) {
      console.error('Error setting primary CV:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to set primary CV',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
});
router.get('/cvs/:cvId/download', authenticate as RequestHandler,
   async (req: Request, res: Response): Promise<void> => {
    try {
  const { cvId } = req.params;
  const userId = req.user!.id;
  
  console.log(` Download: CV ${cvId}`);
  // Validate cvId parameter exists
  if (!cvId) {
    res.status(400).json({
      success: false,
      message: 'CV ID is required',
    });
    return;
  }
  
  // Get CV and verify ownership
  const cv = await prisma.cV.findUnique({ where: { id: cvId } });
  if (!cv || cv.userId !== userId) {
    res.status(404).json({ success: false });
    return;
  }
  
  // Stream file
  const filePath = path.join(process.cwd(), 'public', cv.fileUrl);
  console.log(`File path: ${filePath}`);
  if (!fs.existsSync(filePath)) {
        console.log(` File not found!`);
        res.status(404).json({
          success: false,
          message: 'File not found on server',
        });
        return;
      }

      console.log(` Streaming file...`);
      // Stream file
      const fileStream = fs.createReadStream(filePath);
      
      fileStream.on('error', (error) => {
        console.error('Stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Error streaming file',
          });
        }
      });

      fileStream.pipe(res);

      fileStream.on('end', () => {
        console.log(` Download complete`);
      });
    }catch (error) {
      console.error(' Download error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to download CV',
        });
      }
    }

    
});
/**
 * Health check for ML service
 */
router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    const mlResponse = await fetch(`${ML_SERVICE_URL}/`, {
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