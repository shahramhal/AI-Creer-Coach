export interface DashboardActivity {
  id: string;
  type:
    | 'cv_upload'
    | 'cv_update'
    | 'cv_delete'
    | 'cv_analyze'
    | 'ats_check'
    | 'profile_update'
    | 'settings_update'
    | 'job_saved'
    | 'learning_started'
    | 'learning_completed'
    | 'application';
  title: string;
  description: string;
  timestamp: string;
}
