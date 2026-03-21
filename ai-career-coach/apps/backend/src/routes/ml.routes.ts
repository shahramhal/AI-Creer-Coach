// apps/backend/src/routes/ml.routes.ts
import { Router } from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { authenticate } from '../middlewares/auth.middleware.js';
import { prisma, cache } from '../config/database.js';
import { logUserActivity } from '../utils/activity.util.js';
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
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
      let formData = new FormData();
      const fileBlob = new Blob([new Uint8Array(req.file.buffer)], {
        type: req.file.mimetype
      });
      formData.append('file', fileBlob, filename);

      // Step 2: Forward to ML service for parsing (with retry for transient errors)
      console.log(` Forwarding to ML service: ${ML_SERVICE_URL}/api/ml/parse-cv`);

      const authHeader = req.headers.authorization;
      const MAX_RETRIES = 2;
      let mlData: any = null;
      let mlResponse: globalThis.Response | null = null;
      let lastError: string | null = null;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (attempt > 0) {
          const delayMs = attempt * 3000; // 3s, 6s
          console.log(` Retry ${attempt}/${MAX_RETRIES} after ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));

          // Rebuild FormData for retry (previous body was consumed)
          const retryFormData = new FormData();
          const retryBlob = new Blob([req.file!.buffer], { type: req.file!.mimetype });
          retryFormData.append('file', retryBlob, filename);
          formData = retryFormData;
        }

        mlResponse = await fetch(`${ML_SERVICE_URL}/api/ml/parse-cv`, {
          method: 'POST',
          body: formData,
          headers: authHeader ? { 'Authorization': authHeader } : {},
        });

        mlData = await mlResponse.json();

        // Check if this is a retryable error (overloaded / 529)
        const isOverloaded = !mlResponse.ok || mlData.success === false || !mlData.data;
        const isRetryable = mlData.error?.includes?.('overloaded') || mlData.error?.includes?.('529');

        if (!isOverloaded) break; // Success
        lastError = mlData.error || mlData.message || 'Unknown ML error';

        if (!isRetryable || attempt === MAX_RETRIES) {
          console.error(` ML service error (attempt ${attempt + 1}):`, mlData);

          const message = isRetryable
            ? 'The AI parsing service is temporarily overloaded. Please try again in a minute.'
            : mlData.message || mlData.error || 'Failed to parse CV';

          res.status(isRetryable ? 503 : (mlResponse.ok ? 502 : mlResponse.status)).json({
            success: false,
            message,
            error: mlData.error,
          });
          return;
        }

        console.warn(` ML service overloaded (attempt ${attempt + 1}), will retry...`);
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

      // Insert parsed data into MongoDB
      const cvRawText = parsedData.raw_text || parsedData.metadata?.raw_text || parsedData.full_text || '';
      const mongoResult = await mongoCollection.insertOne({
        user_id: userId,
        filename: filename,
        raw_text: cvRawText,
        skills: parsedData.skills || [],
        experience: parsedData.experience || [],
        education: parsedData.education || [],
        contact_info: parsedData.contact_info || {},
        summary: parsedData.summary || '',
        metadata: { raw_text: cvRawText },
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

      // Step 5: Invalidate user caches (CV list + job matching)
      await cache.del(`cvs:user:${userId}`);
      await cache.delByPattern(`match:user:${userId}:*`);
      console.log(`📦 [Cache] Invalidated CV list + matching caches for user: ${userId}`);

      logUserActivity(userId, 'cv_upload', 'CV Uploaded', cvRecord.filename);

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
      next(error);
    }
});

/**
 * Get user's CVs
 * Returns all CVs for authenticated user
 */
router.get(
  '/cvs',
  authenticate as RequestHandler,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;

      // Check cache first
      const cacheKey = `cvs:user:${userId}`;
      const cachedResponse = await cache.get(cacheKey);
      if (cachedResponse) {
        console.log(`📦 [Cache] CV list cache HIT for user: ${userId}`);
        res.json(cachedResponse);
        return;
      }

      // Fetch CV metadata from PostgreSQL
      const cvs = await prisma.cV.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          filename: true,
          mongoDocId: true,
          analysisData: true,
          overviewData: true,
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
            analysisData: cv.analysisData,
            overviewData: cv.overviewData,
            isPrimary: cv.isPrimary,
            createdAt: cv.createdAt,
            updatedAt: cv.updatedAt,
          };
        }),
      );

      const responseData = {
        success: true,
        data: cvsWithParsedData,
        count: cvsWithParsedData.length,
      };

      // Cache for 5 minutes
      await cache.set(cacheKey, responseData, 300);

      res.json(responseData);

    } catch (error) {
      next(error);
    }
});

/**
 * Get specific CV by ID
 */
router.get(
  '/cvs/:cvId',
  authenticate as RequestHandler,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
          overviewData: cv.overviewData ?? null,
          isPrimary: cv.isPrimary,
          createdAt: cv.createdAt,
          updatedAt: cv.updatedAt,
        },
      });

    } catch (error) {
      next(error);
    }
});

/**
 * Delete CV
 */
router.delete(
  '/cvs/:cvId',
  authenticate as RequestHandler,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      await prisma.cV.delete({
        where: { id: cvId },
      });

      await cache.del(`cvs:user:${userId}`);
      await cache.delByPattern(`match:user:${userId}:*`);
      console.log(`📦 [Cache] Invalidated CV list + matching caches for user: ${userId}`);

      logUserActivity(userId, 'cv_delete', 'CV Deleted', cv.filename);

      res.json({
        success: true,
        message: 'CV deleted successfully',
      });

    } catch (error) {
      next(error);
    }
});

/**
 * Set primary CV
 */
router.patch(
  '/cvs/:cvId/primary',
  authenticate as RequestHandler,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
          overviewData: updatedCv.overviewData ?? null,
          isPrimary: updatedCv.isPrimary,
          createdAt: updatedCv.createdAt,
          updatedAt: updatedCv.updatedAt,
        },
      });

    } catch (error) {
      next(error);
    }
});
router.get('/cvs/:cvId/download', authenticate as RequestHandler,
   async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    } catch (error) {
      if (!res.headersSent) {
        next(error);
      }
    }
});
/**
 * Analyze CV — triggers ML analysis and stores results
 * Returns ATS scores, keyword gaps, and recommendations
 */
router.post(
  '/cvs/:cvId/analyze',
  authenticate as RequestHandler,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const cvId = req.params.cvId;

      if (!cvId) {
        res.status(400).json({ success: false, message: 'CV ID is required' });
        return;
      }

      // Verify ownership
      const cv = await prisma.cV.findUnique({ where: { id: cvId } });
      if (!cv || cv.userId !== userId) {
        res.status(404).json({ success: false, message: 'CV not found' });
        return;
      }

      // Return cached analysis if it exists (skip ML call entirely)
      const cachedResult = cv.overviewData ?? cv.analysisData;
      if (cachedResult && !req.body?.forceReanalyze) {
        console.log(`📦 [Cache] Returning cached analysis for CV: ${cvId}`);
        res.json({
          success: true,
          message: 'CV analysis loaded from cache',
          data: cachedResult,
        });
        return;
      }

      // Fetch parsed data + raw text from MongoDB
      if (!cv.mongoDocId || mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
        res.status(400).json({
          success: false,
          message: 'Parsed CV data not available for analysis',
        });
        return;
      }

      const mongoCollection = mongoose.connection.db.collection('parsed_cvs');
      const mongoDoc = await mongoCollection.findOne({
        _id: new mongoose.Types.ObjectId(cv.mongoDocId),
      });

      if (!mongoDoc) {
        res.status(404).json({
          success: false,
          message: 'Parsed CV data not found in database',
        });
        return;
      }

      // Extract raw text and parsed data
      let rawText = mongoDoc.raw_text || mongoDoc.metadata?.raw_text || '';
      const parsedData = {
        contact_info: mongoDoc.contact_info || {},
        summary: mongoDoc.summary || '',
        experience: mongoDoc.experience || [],
        education: mongoDoc.education || [],
        skills: mongoDoc.skills || [],
        certifications: mongoDoc.certifications || [],
        projects: mongoDoc.projects || [],
      };

      // If no raw_text stored, build from parsed fields
      if (!rawText) {
        const textParts: string[] = [];
        if (parsedData.summary) textParts.push(parsedData.summary);
        if (parsedData.skills?.length) textParts.push(`Skills: ${parsedData.skills.join(', ')}`);
        for (const exp of parsedData.experience as any[]) {
          const parts = [exp.title, exp.company, ...(exp.responsibilities || [])].filter(Boolean);
          if (parts.length) textParts.push(parts.join(' - '));
        }
        for (const edu of parsedData.education as any[]) {
          const parts = [edu.degree, edu.institution, edu.field].filter(Boolean);
          if (parts.length) textParts.push(parts.join(' - '));
        }
        rawText = textParts.join('\n');
      }

      // Get target role from request body (optional, from user settings)
      const targetRole = req.body?.targetRole || null;

      console.log(`Analyzing CV: ${cv.filename} for user: ${userId} (text: ${rawText.length} chars)`);

      // Call ML service for CV overview (job-agnostic analysis)
      const mlResponse = await fetch(`${ML_SERVICE_URL}/api/ml/cv-overview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cv_text: rawText,
          parsed_data: parsedData,
          filename: cv.filename,
        }),
      });

      const mlData = await mlResponse.json();

      if (!mlResponse.ok || !mlData.success) {
        console.error('ML analysis error:', mlData);
        res.status(500).json({
          success: false,
          message: mlData.error || 'CV analysis failed',
        });
        return;
      }

      const analysisData = mlData.data;

      // Store in both overviewData (new) and analysisData (backward compat)
      await prisma.cV.update({
        where: { id: cvId },
        data: {
          overviewData: analysisData,
          analysisData: analysisData,
        },
      });

      // Invalidate CV list cache so score shows in list
      await cache.del(`cvs:user:${userId}`);

      console.log(`Analysis stored for CV: ${cvId}, score: ${analysisData.overallScore}/100`);

      logUserActivity(userId, 'cv_analyze', 'CV Analyzed', `${cv.filename} — Score: ${analysisData.overallScore}/100`);

      res.json({
        success: true,
        message: 'CV analyzed successfully',
        data: analysisData,
      });

    } catch (error) {
      next(error);
    }
  }
);

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