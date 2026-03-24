import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { MlService } from '../services/ml.service.js';

const mlService = new MlService();

export const parseCv = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
      return;
    }

    const userId = req.user!.id;
    const authHeader = req.headers.authorization;

    const result = await mlService.parseCv(userId, req.file, authHeader);

    res.status(200).json({
      success: true,
      message: 'CV parsed and saved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getCVs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const responseData = await mlService.getUserCVs(userId);
    res.json(responseData);
  } catch (error) {
    next(error);
  }
};

export const getCVById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const cvId = req.params.cvId!;
    const cvData = await mlService.getCVById(userId, cvId);
    res.json({
      success: true,
      data: cvData,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCV = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const cvId = req.params.cvId!;
    await mlService.deleteCV(userId, cvId);
    res.json({
      success: true,
      message: 'CV deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const setPrimaryCV = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const cvId = req.params.cvId!;
    const updatedCvData = await mlService.setPrimaryCV(userId, cvId);
    res.json({
      success: true,
      message: 'Primary CV updated',
      data: updatedCvData,
    });
  } catch (error) {
    next(error);
  }
};

export const downloadCV = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cvId = req.params.cvId!;
    const userId = req.user!.id;

    console.log(` Download: CV ${cvId}`);

    const filePath = await mlService.getCVFilePath(userId, cvId);

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
};

export const analyzeCV = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const cvId = req.params.cvId!;
    const forceReanalyze = req.body?.forceReanalyze ?? false;
    const targetRole = req.body?.targetRole || null;

    const result = await mlService.analyzeCV(userId, cvId, forceReanalyze, targetRole);

    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

export const healthCheck = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await mlService.checkHealth();
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error('ML service health check failed:', error);
    res.status(503).json({
      success: false,
      message: 'ML service unavailable',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
