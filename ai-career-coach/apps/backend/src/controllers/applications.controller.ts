import type { Request, Response } from 'express';
import { ApplicationsService, VALID_STATUSES, UUID_RE } from '../services/applications.service.js';
import { logUserActivity } from '../utils/activity.util.js';

const applicationsService = new ApplicationsService();

export const createApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { company, jobTitle, sourceUrl, location, notes } = req.body;

    if (!company || typeof company !== 'string' || !company.trim()) {
      res.status(400).json({ success: false, message: 'Company is required' });
      return;
    }
    if (!jobTitle || typeof jobTitle !== 'string' || !jobTitle.trim()) {
      res.status(400).json({ success: false, message: 'Job title is required' });
      return;
    }
    if (company.trim().length > 255) {
      res.status(400).json({ success: false, message: 'Company name must be under 255 characters' });
      return;
    }
    if (jobTitle.trim().length > 255) {
      res.status(400).json({ success: false, message: 'Job title must be under 255 characters' });
      return;
    }
    if (notes && typeof notes === 'string' && notes.length > 5000) {
      res.status(400).json({ success: false, message: 'Notes must be under 5000 characters' });
      return;
    }

    const application = await applicationsService.createApplication(userId, {
      company,
      jobTitle,
      sourceUrl,
      location,
      notes,
    });

    if (!application) {
      res.status(409).json({
        success: false,
        message: 'You have already tracked an application for this position',
      });
      return;
    }

    logUserActivity(userId, 'application', 'Application Tracked', `${jobTitle} at ${company}`);

    res.status(201).json({
      success: true,
      message: 'Application tracked successfully',
      data: application,
    });
  } catch (error) {
    console.error('Error creating application:', error);
    res.status(500).json({ success: false, message: 'Failed to create application' });
  }
};

export const listApplications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { status } = req.query;

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));

    const { applications, total } = await applicationsService.listApplications(userId, {
      status: typeof status === 'string' ? status : undefined,
      page,
      limit,
    });

    res.json({
      success: true,
      message: 'Applications retrieved',
      data: applications,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch applications' });
  }
};

export const getApplicationStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const stats = await applicationsService.getStats(userId);

    res.json({
      success: true,
      message: 'Application stats retrieved',
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching application stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch application stats' });
  }
};

export const updateApplicationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { status } = req.body;

    if (!UUID_RE.test(id)) {
      res.status(404).json({ success: false, message: 'Application not found' });
      return;
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      res.status(400).json({
        success: false,
        message: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
      });
      return;
    }

    const updated = await applicationsService.updateStatus(userId, id, status);
    if (!updated) {
      res.status(404).json({ success: false, message: 'Application not found' });
      return;
    }

    res.json({ success: true, message: 'Application status updated', data: updated });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ success: false, message: 'Failed to update application status' });
  }
};

export const deleteApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!UUID_RE.test(id)) {
      res.status(404).json({ success: false, message: 'Application not found' });
      return;
    }

    const deleted = await applicationsService.deleteApplication(userId, id);
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Application not found' });
      return;
    }

    res.json({ success: true, message: 'Application deleted' });
  } catch (error) {
    console.error('Error deleting application:', error);
    res.status(500).json({ success: false, message: 'Failed to delete application' });
  }
};

export const atsCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { jobDescription, cvId } = req.body;

    if (
      !jobDescription ||
      typeof jobDescription !== 'string' ||
      jobDescription.trim().length < 20 ||
      jobDescription.length > 10_000
    ) {
      res.status(400).json({
        success: false,
        message: 'Job description must be between 20 and 10,000 characters',
      });
      return;
    }

    const result = await applicationsService.atsCheck(userId, jobDescription, cvId);

    if ('error' in result) {
      res.status(result.status).json({ success: false, message: result.error });
      return;
    }

    logUserActivity(userId, 'ats_check', 'ATS Score Checked', `Score: ${result.atsScore ?? 'N/A'}/100`);

    res.json({ success: true, message: 'ATS score calculated', data: result.data });
  } catch (error) {
    console.error('Error in ATS check:', error);
    res.status(500).json({ success: false, message: 'Failed to check ATS score' });
  }
};

export const atsPreview = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { jobId } = req.params;

    if (!jobId) {
      res.status(400).json({ success: false, message: 'Job ID is required' });
      return;
    }

    const result = await applicationsService.atsPreview(userId, jobId, req.body?.cvId);

    if ('error' in result) {
      res.status(result.status).json({ success: false, message: result.error });
      return;
    }

    res.json({ success: true, message: 'ATS preview calculated', data: result.data });
  } catch (error) {
    console.error('Error previewing ATS score:', error);
    res.status(500).json({ success: false, message: 'Failed to preview ATS score' });
  }
};

export const atsScore = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { applicationId } = req.params;

    if (!applicationId) {
      res.status(400).json({ success: false, message: 'Application ID is required' });
      return;
    }

    const result = await applicationsService.atsScore(userId, applicationId, req.body?.cvId);

    if ('error' in result) {
      res.status(result.status).json({ success: false, message: result.error });
      return;
    }

    res.json({ success: true, message: 'ATS score calculated successfully', data: result.data });
  } catch (error) {
    console.error('Error calculating ATS score:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate ATS score' });
  }
};
