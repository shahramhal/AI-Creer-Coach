export interface DashboardActivity {
  id: string;
  type: 'cv_upload' | 'cv_update' | 'job_saved' | 'learning_started' | 'learning_completed' | 'application';
  title: string;
  description: string;
  timestamp: string;
}
