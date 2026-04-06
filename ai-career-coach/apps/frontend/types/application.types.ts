export type ApplicationStatus = 'applied' | 'interview' | 'offer' | 'rejected';

export interface Application {
  id: string;
  company: string;
  jobTitle: string;
  status: ApplicationStatus;
  appliedDate: string;
  sourceUrl: string | null;
  location: string | null;
  notes: string | null;
  atsScore: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationStats {
  total: number;
  byStatus: Record<ApplicationStatus, number>;
  responseRate: number;
}

export interface CreateApplicationPayload {
  company: string;
  jobTitle: string;
  sourceUrl?: string;
  location?: string;
  notes?: string;
}
