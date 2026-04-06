import mongoose from 'mongoose';
import { promises as fsp } from 'fs';
import path from 'path';
import { prisma, cache } from '../config/database.js';
import { logUserActivity } from '../utils/activity.util.js';
import { buildCVText } from '../utils/cv-text.util.js';
import { AppError, ErrorCodes } from '../utils/app-error.util.js';

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

export class MlService {
  async parseCv(
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string },
    authHeader?: string
  ): Promise<{ cvId: string; filename: string; parsedData: Record<string, unknown>; createdAt: Date }> {
    const safeBasename = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${Date.now()}-${safeBasename}`;

    console.log(` Processing CV: ${filename} for user: ${userId}`);

    // Step 1: Create FormData for ML service
    let formData = new FormData();
    const fileBlob = new Blob([new Uint8Array(file.buffer)], {
      type: file.mimetype
    });
    formData.append('file', fileBlob, filename);

    // Step 2: Forward to ML service for parsing (with retry for transient errors)
    console.log(` Forwarding to ML service: ${ML_SERVICE_URL}/api/ml/parse-cv`);

    const MAX_RETRIES = 2;
    let mlData: any = null;
    let mlResponse: globalThis.Response | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delayMs = attempt * 3000; // 3s, 6s
        console.log(` Retry ${attempt}/${MAX_RETRIES} after ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));

        // Rebuild FormData for retry (previous body was consumed)
        const retryFormData = new FormData();
        const retryBlob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype });
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

      if (!isRetryable || attempt === MAX_RETRIES) {
        console.error(` ML service error (attempt ${attempt + 1}):`, mlData);

        const message = isRetryable
          ? 'The AI parsing service is temporarily overloaded. Please try again in a minute.'
          : mlData.message || mlData.error || 'Failed to parse CV';

        const statusCode = isRetryable ? 503 : (mlResponse.ok ? 502 : mlResponse.status);
        throw new AppError(message, statusCode, ErrorCodes.ML_SERVICE_ERROR, { mlError: mlData.error });
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
    await fsp.mkdir(uploadDir, { recursive: true });

    // Save file
    const filePath = path.join(uploadDir, filename);
    await fsp.writeFile(filePath, file.buffer);

    console.log(` File saved: ${filePath}`);

    // Verify
    try {
      await fsp.access(filePath);
    } catch {
      throw new Error('File save failed');
    }

    // Step 3: Save parsed data to MongoDB (primary store)
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
      throw new AppError(
        'MongoDB unavailable - cannot store parsed CV data',
        503,
        ErrorCodes.INTERNAL_ERROR
      );
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
    console.log(` [Cache] Invalidated CV list + matching caches for user: ${userId}`);

    logUserActivity(userId, 'cv_upload', 'CV Uploaded', cvRecord.filename);

    return {
      cvId: cvRecord.id,
      filename: cvRecord.filename,
      parsedData: transformParsedDataForFrontend(parsedData),
      createdAt: cvRecord.createdAt,
    };
  }

  async getUserCVs(userId: string) {
    // Check cache first
    const cacheKey = `cvs:user:${userId}`;
    const cachedResponse = await cache.get(cacheKey);
    if (cachedResponse) {
      console.log(` [Cache] CV list cache HIT for user: ${userId}`);
      return cachedResponse;
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

    return responseData;
  }

  async getCVById(userId: string, cvId: string) {
    // Validate cvId parameter exists
    if (!cvId) {
      throw new AppError('CV ID is required', 400, ErrorCodes.VALIDATION_ERROR);
    }

    // Fetch CV metadata and verify ownership
    const cv = await prisma.cV.findUnique({
      where: { id: cvId },
    });

    if (!cv || cv.userId !== userId) {
      throw new AppError('CV not found', 404, ErrorCodes.NOT_FOUND);
    }

    // Fetch parsed data from MongoDB
    const parsedData = cv.mongoDocId
      ? await fetchParsedDataFromMongo(cv.mongoDocId)
      : null;

    return {
      id: cv.id,
      filename: cv.filename,
      fileUrl: cv.fileUrl,
      parsedData,
      analysisData: cv.analysisData,
      overviewData: cv.overviewData ?? null,
      isPrimary: cv.isPrimary,
      createdAt: cv.createdAt,
      updatedAt: cv.updatedAt,
    };
  }

  async deleteCV(userId: string, cvId: string): Promise<void> {
    // Validate cvId parameter exists
    if (!cvId) {
      throw new AppError('CV ID is required', 400, ErrorCodes.VALIDATION_ERROR);
    }

    // Verify ownership before deleting
    const cv = await prisma.cV.findUnique({
      where: { id: cvId },
    });

    if (!cv || cv.userId !== userId) {
      throw new AppError('CV not found', 404, ErrorCodes.NOT_FOUND);
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
    console.log(` [Cache] Invalidated CV list + matching caches for user: ${userId}`);

    logUserActivity(userId, 'cv_delete', 'CV Deleted', cv.filename);
  }

  async setPrimaryCV(userId: string, cvId: string) {
    // Validate cvId parameter exists
    if (!cvId) {
      throw new AppError('CV ID is required', 400, ErrorCodes.VALIDATION_ERROR);
    }

    // Verify ownership
    const cv = await prisma.cV.findUnique({
      where: { id: cvId },
    });

    if (!cv || cv.userId !== userId) {
      throw new AppError('CV not found', 404, ErrorCodes.NOT_FOUND);
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

    return {
      id: updatedCv.id,
      filename: updatedCv.filename,
      fileUrl: updatedCv.fileUrl,
      parsedData,
      analysisData: updatedCv.analysisData,
      overviewData: updatedCv.overviewData ?? null,
      isPrimary: updatedCv.isPrimary,
      createdAt: updatedCv.createdAt,
      updatedAt: updatedCv.updatedAt,
    };
  }

  async getCVFilePath(userId: string, cvId: string): Promise<string> {
    if (!cvId) {
      throw new AppError('CV ID is required', 400, ErrorCodes.VALIDATION_ERROR);
    }

    // Get CV and verify ownership
    const cv = await prisma.cV.findUnique({ where: { id: cvId } });
    if (!cv || cv.userId !== userId) {
      throw new AppError('CV not found', 404, ErrorCodes.NOT_FOUND);
    }

    return path.join(process.cwd(), 'public', cv.fileUrl);
  }

  async analyzeCV(
    userId: string,
    cvId: string,
    forceReanalyze: boolean,
    targetRole?: string
  ): Promise<{ data: any; message: string }> {
    if (!cvId) {
      throw new AppError('CV ID is required', 400, ErrorCodes.VALIDATION_ERROR);
    }

    // Verify ownership
    const cv = await prisma.cV.findUnique({ where: { id: cvId } });
    if (!cv || cv.userId !== userId) {
      throw new AppError('CV not found', 404, ErrorCodes.NOT_FOUND);
    }

    // Return cached analysis if it exists (skip ML call entirely)
    const cachedResult = cv.overviewData ?? cv.analysisData;
    if (cachedResult && !forceReanalyze) {
      console.log(` [Cache] Returning cached analysis for CV: ${cvId}`);
      return { data: cachedResult, message: 'CV analysis loaded from cache' };
    }

    // Fetch parsed data + raw text from MongoDB
    if (!cv.mongoDocId || mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
      throw new AppError(
        'Parsed CV data not available for analysis',
        400,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    const mongoCollection = mongoose.connection.db.collection('parsed_cvs');
    const mongoDoc = await mongoCollection.findOne({
      _id: new mongoose.Types.ObjectId(cv.mongoDocId),
    });

    if (!mongoDoc) {
      throw new AppError(
        'Parsed CV data not found in database',
        404,
        ErrorCodes.NOT_FOUND
      );
    }

    // Extract raw text and parsed data
    const rawText = buildCVText(mongoDoc);
    const parsedData = {
      contact_info: mongoDoc.contact_info || {},
      summary: mongoDoc.summary || '',
      experience: mongoDoc.experience || [],
      education: mongoDoc.education || [],
      skills: mongoDoc.skills || [],
      certifications: mongoDoc.certifications || [],
      projects: mongoDoc.projects || [],
    };

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
      throw new AppError(
        mlData.error || 'CV analysis failed',
        500,
        ErrorCodes.ML_SERVICE_ERROR
      );
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

    logUserActivity(userId, 'cv_analyze', 'CV Analyzed', `${cv.filename} - Score: ${analysisData.overallScore}/100`);

    return { data: analysisData, message: 'CV analyzed successfully' };
  }

  async checkHealth(): Promise<{ status: number; data: any }> {
    const mlResponse = await fetch(`${ML_SERVICE_URL}/`, {
      method: 'GET',
    });

    const responseData = await mlResponse.json();
    return { status: mlResponse.status, data: responseData };
  }
}
