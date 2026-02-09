// apps/backend/src/routes/ml.routes.ts
import { Router } from 'express';
import type { Request, Response, RequestHandler } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { authenticate } from '../middlewares/auth.middleware.js';
import { prisma } from '../config/database.js';
import fs from 'fs';
import path from 'path';

const router = Router();
const upload = multer();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:8000';

/**
 * Parse a date range string like "Nov 2024 - May 2025" into startDate/endDate.
 * Returns { startDate, endDate } with the original substrings or undefined.
 */
function parseDateRange(dates?: string): { startDate: string; endDate: string } {
  if (!dates) return { startDate: '', endDate: '' };
  const parts = dates.split(/\s*[-–]\s*/);
  return {
    startDate: parts[0]?.trim() || '',
    endDate: parts[1]?.trim() || '',
  };
}

/**
 * Transform raw ML/MongoDB parsed data into the shape the frontend expects.
 * Maps contact_info -> personal, experience.dates -> startDate/endDate, etc.
 */
function transformParsedDataForFrontend(raw: Record<string, any>): Record<string, unknown> {
  const contactInfo = raw.contact_info || raw.personal || {};

  const experience = (raw.experience || []).map((exp: any) => {
    const { startDate, endDate } = parseDateRange(exp.dates);
    return {
      company: exp.company || '',
      title: exp.title || '',
      location: exp.location || '',
      startDate: exp.startDate || startDate || '',
      endDate: exp.endDate || endDate || '',
      duration: exp.duration || '',
      responsibilities: exp.responsibilities || [],
      achievements: exp.achievements || [],
    };
  });

  const education = (raw.education || []).map((edu: any) => {
    const { startDate, endDate } = parseDateRange(edu.dates);
    return {
      institution: edu.institution || '',
      degree: edu.degree || '',
      field: edu.field || '',
      location: edu.location || '',
      startDate: edu.startDate || startDate || '',
      endDate: edu.endDate || endDate || '',
      gpa: edu.gpa || edu.grade || '',
      achievements: edu.achievements || [],
    };
  });

  return {
    personal: {
      name: contactInfo.name || '',
      email: contactInfo.email || '',
      phone: contactInfo.phone || '',
      location: contactInfo.location || '',
      linkedin: contactInfo.linkedin || '',
      github: contactInfo.github || '',
      website: contactInfo.website || '',
    },
    summary: raw.summary || '',
    experience,
    education,
    skills: raw.skills || [],
    certifications: raw.certifications || [],
    languages: raw.languages || [],
    projects: raw.projects || [],
  };
}

/** Fetch parsed CV data from MongoDB by document ID */
async function fetchParsedDataFromMongo(mongoDocId: string): Promise<Record<string, unknown> | null> {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    return null;
  }
  const mongoCollection = mongoose.connection.db.collection('parsed_cvs');
  const doc = await mongoCollection.findOne({ _id: new mongoose.Types.ObjectId(mongoDocId) });
  if (!doc) return null;
  return transformParsedDataForFrontend(doc);
}

/**
 * Upload and parse CV
 * Protected route - requires authentication
 * 
 * Flow:
 * 1. User uploads CV file
 * 2. Forward to ML service for parsing
 * 3. Save parsed data to MongoDB (primary store)
 * 4. Save metadata + mongoDocId to PostgreSQL
 * 5. Return parsed data to user
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

      // Step 3: Save parsed data to MongoDB (primary store)
      if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
        res.status(503).json({
          success: false,
          message: 'MongoDB unavailable - cannot store parsed CV data',
        });
        return;
      }

      const mongoCollection = mongoose.connection.db.collection('parsed_cvs');

      // Remove old CVs for this user
      await mongoCollection.deleteMany({ user_id: userId });

      // Insert parsed data into MongoDB
      const mongoResult = await mongoCollection.insertOne({
        user_id: userId,
        filename: filename,
        raw_text: parsedData.raw_text || parsedData.full_text || '',
        skills: parsedData.skills || [],
        experience: parsedData.experience || [],
        education: parsedData.education || [],
        contact_info: parsedData.contact_info || {},
        summary: parsedData.summary || '',
        metadata: { raw_text: parsedData.raw_text || parsedData.full_text },
        created_at: new Date(),
      });

      const mongoDocId = mongoResult.insertedId.toString();
      console.log(` Saved to MongoDB with ID: ${mongoDocId}`);

      // Step 4: Save metadata + mongoDocId to PostgreSQL
      const cvRecord = await prisma.cV.create({
        data: {
          userId: userId,
          filename: filename,
          fileUrl: `/uploads/cvs/${userId}/${filename}`,
          mongoDocId: mongoDocId,
          isPrimary: false,
        },
      });

      console.log(` Saved to PostgreSQL with ID: ${cvRecord.id}`);

      // Update MongoDB doc with the PostgreSQL cv_id back-reference
      await mongoCollection.updateOne(
        { _id: mongoResult.insertedId },
        { $set: { cv_id: cvRecord.id } },
      );

      // Step 5: Return response (transform to frontend shape)
      res.status(200).json({
        success: true,
        message: 'CV parsed and saved successfully',
        data: {
          cvId: cvRecord.id,
          filename: cvRecord.filename,
          parsedData: transformParsedDataForFrontend(parsedData),
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

      // Fetch CV metadata from PostgreSQL
      const cvs = await prisma.cV.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          filename: true,
          mongoDocId: true,
          isPrimary: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Batch-fetch parsed data from MongoDB
      const cvsWithParsedData = await Promise.all(
        cvs.map(async (cv) => {
          const parsedData = cv.mongoDocId
            ? await fetchParsedDataFromMongo(cv.mongoDocId)
            : null;
          return {
            id: cv.id,
            filename: cv.filename,
            parsedData,
            isPrimary: cv.isPrimary,
            createdAt: cv.createdAt,
            updatedAt: cv.updatedAt,
          };
        }),
      );

      res.json({
        success: true,
        data: cvsWithParsedData,
        count: cvsWithParsedData.length,
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

      // Fetch CV metadata and verify ownership
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

      // Fetch parsed data from MongoDB
      const parsedData = cv.mongoDocId
        ? await fetchParsedDataFromMongo(cv.mongoDocId)
        : null;

      res.json({
        success: true,
        data: {
          id: cv.id,
          filename: cv.filename,
          fileUrl: cv.fileUrl,
          parsedData,
          analysisData: cv.analysisData,
          isPrimary: cv.isPrimary,
          createdAt: cv.createdAt,
          updatedAt: cv.updatedAt,
        },
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

      // Delete from MongoDB using mongoDocId
      if (cv.mongoDocId) {
        try {
          if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
            await mongoose.connection.db.collection('parsed_cvs').deleteOne({
              _id: new mongoose.Types.ObjectId(cv.mongoDocId),
            });
            console.log(`Deleted CV from MongoDB: ${cv.mongoDocId}`);
          }
        } catch (mongoError) {
          console.warn(`MongoDB cleanup failed:`, mongoError);
        }
      }

      // Delete CV from PostgreSQL
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

      // Fetch parsed data from MongoDB for the response
      const parsedData = updatedCv.mongoDocId
        ? await fetchParsedDataFromMongo(updatedCv.mongoDocId)
        : null;

      res.json({
        success: true,
        message: 'Primary CV updated',
        data: {
          id: updatedCv.id,
          filename: updatedCv.filename,
          fileUrl: updatedCv.fileUrl,
          parsedData,
          analysisData: updatedCv.analysisData,
          isPrimary: updatedCv.isPrimary,
          createdAt: updatedCv.createdAt,
          updatedAt: updatedCv.updatedAt,
        },
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