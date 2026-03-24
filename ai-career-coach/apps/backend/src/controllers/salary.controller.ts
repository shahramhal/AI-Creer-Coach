import type { Request, Response, NextFunction } from 'express';
import { SalaryService } from '../services/salary.service.js';

const salaryService = new SalaryService();

export const getInsights = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const jobTitle = (req.query.jobTitle as string) || '';
    const location = (req.query.location as string) || '';
    const country = (req.query.country as string) || 'gb';
    const responseData = await salaryService.getSalaryInsights(userId, jobTitle, location, country);
    res.json(responseData);
  } catch (error) {
    next(error);
  }
};

export const savePreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { jobTitle, location } = req.body;
    const profile = await salaryService.savePreferences(userId, jobTitle, location);
    res.json({ success: true, message: 'Preferences updated', data: profile });
  } catch (error) {
    next(error);
  }
};
