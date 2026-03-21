export interface MissingSkill {
  name: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  frequency: string;
  estimated_hours: number;
  salary_impact: string;
  roi_score: number;
}

export interface PhaseSkill {
  name: string;
  category: string;
  estimated_hours: number;
  priority: 'high' | 'medium' | 'low';
  roi_score: number;
}

export interface LearningPhase {
  phase: string;
  description: string;
  total_hours: number;
  skills: PhaseSkill[];
}

export interface CategoryBreakdown {
  category: string;
  current: number;
  target: number;
  matched: number;
}

export interface SkillGapAnalysis {
  current_skills: string[];
  target_role: string;
  skill_coverage: number;
  matched_count: number;
  total_target_skills: number;
  missing_skills: MissingSkill[];
  recommended_learning_path: LearningPhase[];
  category_breakdown: CategoryBreakdown[];
  total_estimated_hours: number;
  summary: string;
  learning_path_ids: string[];
}

export interface LearningPathRecord {
  id: string;
  userId: string;
  skillId: string;
  priority: number;
  estimatedHours: number | null;
  status: string;
  progressPercentage: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  skill: {
    id: string;
    name: string;
    category: string;
    description: string | null;
    courses?: CourseRecord[];
  };
}

export interface CourseRecord {
  id: string;
  skillId: string | null;
  title: string;
  platform: string;
  url: string;
  price: number | null;
  duration: number | null;
  rating: number | null;
  numStudents: number | null;
  difficulty: string | null;
  userCourses?: UserCourseRecord[];
}

export interface UserCourseRecord {
  id: string;
  userId: string;
  courseId: string;
  status: string;
  progress: number;
  startedAt: string | null;
  completedAt: string | null;
}

export interface ProgressSummary {
  totalPaths: number;
  completedPaths: number;
  inProgressPaths: number;
  notStartedPaths: number;
  totalEstimatedHours: number;
  completedHours: number;
  overallProgress: number;
  paths: Array<{
    id: string;
    skillName: string;
    skillCategory: string;
    priority: number;
    status: string;
    progressPercentage: number;
    estimatedHours: number | null;
    startedAt: string | null;
    completedAt: string | null;
  }>;
}

export interface SkillGapResponse {
  success: boolean;
  data: SkillGapAnalysis;
}

export interface LearningPathsResponse {
  success: boolean;
  data: LearningPathRecord[];
}

export interface ProgressSummaryResponse {
  success: boolean;
  data: ProgressSummary;
}
