import api from '../library/api';
import type {
  SkillGapResponse,
  LearningPathsResponse,
  LearningPathRecord,
  ProgressSummaryResponse,
} from '../types/skillGap.types';

class SkillGapServiceClient {
  async analyze(targetRole?: string, targetJobDescription?: string): Promise<SkillGapResponse> {
    const response = await api.post('/api/v1/skill-gap/analyze', {
      targetRole,
      targetJobDescription,
    });
    return response.data;
  }

  async getLearningPaths(): Promise<LearningPathsResponse> {
    const response = await api.get('/api/v1/skill-gap/learning-paths');
    return response.data;
  }

  async getLearningPathDetails(learningPathId: string): Promise<{ success: boolean; data: LearningPathRecord }> {
    const response = await api.get(`/api/v1/skill-gap/learning-paths/${learningPathId}`);
    return response.data;
  }

  async updatePathProgress(
    learningPathId: string,
    progressPercentage: number,
  ): Promise<{ success: boolean; data: LearningPathRecord }> {
    const response = await api.patch(`/api/v1/skill-gap/learning-paths/${learningPathId}/progress`, {
      progressPercentage,
    });
    return response.data;
  }

  async updateCourseProgress(
    courseId: string,
    progress: number,
    status: string,
  ): Promise<{ success: boolean; data: any }> {
    const response = await api.patch(`/api/v1/skill-gap/courses/${courseId}/progress`, {
      progress,
      status,
    });
    return response.data;
  }

  async getProgressSummary(): Promise<ProgressSummaryResponse> {
    const response = await api.get('/api/v1/skill-gap/summary');
    return response.data;
  }
}

export const skillGapService = new SkillGapServiceClient();
