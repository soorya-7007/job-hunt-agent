export interface CandidateProfile {
  name?: string;
  email?: string;
  summary: string;
  skills: string[];
  years_experience?: number;
  target_roles: string[];
  locations: string[];
  work_mode?: 'remote' | 'hybrid' | 'onsite' | 'any';
}

export interface JobPosting {
  id: string;
  source: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  salary?: string | null;
  min_salary?: number | null;
  job_type?: string | null;
  experience_level?: string | number | null;
  is_remote: boolean;
  created?: string | null;
}

export interface MatchResult {
  job: JobPosting;
  score: number;
  reasons: string;
  gaps: string[];
}

export interface CritiqueResult {
  passed: boolean;
  flagged: string[];
  notes: string;
}

export interface TailoredResume {
  job_id: string;
  job_title: string;
  company: string;
  full_markdown: string;
  keywords_covered: string[];
  revised: boolean;
  critique?: CritiqueResult | null;
}

export interface CoverLetter {
  job_id: string;
  company: string;
  role: string;
  content: string;
  critique?: CritiqueResult | null;
}

export interface TailorResponse {
  tailored_resume: TailoredResume;
  cover_letter: CoverLetter;
}

export interface InterviewQuestion {
  question: string;
  category: string;
  suggested_answer: string;
  talking_points: string[];
}

export interface InterviewPrep {
  job_id: string;
  company: string;
  role: string;
  company_overview: string;
  likely_questions: InterviewQuestion[];
  key_talking_points: string[];
  questions_to_ask_interviewer: string[];
}

export interface PrepResponse {
  interview_prep: InterviewPrep;
  markdown: string;
}

export interface Application {
  id?: number;
  job_id: string;
  job_title: string;
  company: string;
  location: string;
  url: string;
  fit_score: number;
  status: 'saved' | 'tailored' | 'applied' | 'interview' | 'offer' | 'rejected' | string;
  tailored_summary?: string;
  tailored_bullets?: string[];
  notes?: string;
  updated_at?: string;
}

export interface DashboardSummary {
  total: number;
  by_status: Record<string, number>;
  active_applications: number;
  high_fit_count: number;
}

export interface PendingAction {
  job_title: string;
  company: string;
  action: string;
  priority: 'urgent' | 'high' | 'normal';
}

export interface DashboardResponse {
  summary: DashboardSummary;
  pending_actions: PendingAction[];
}
