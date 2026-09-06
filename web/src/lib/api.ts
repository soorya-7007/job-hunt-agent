import {
  CandidateProfile,
  JobPosting,
  MatchResult,
  TailorResponse,
  TailoredResume,
  PrepResponse,
  DashboardResponse,
  Application,
} from './types';

const API_BASE = "http://localhost:8000";

let cachedProfileStr: string | null = null;
let cachedProfileObj: CandidateProfile | null = null;

export const State = {
  getProfile(): CandidateProfile | null {
    try {
      if (typeof window !== 'undefined') {
        const item = localStorage.getItem('jh_profile');
        if (item === cachedProfileStr) return cachedProfileObj;
        cachedProfileStr = item;
        cachedProfileObj = item ? JSON.parse(item) : null;
        return cachedProfileObj;
      }
    } catch {
      return null;
    }
    return null;
  },
  setProfile(p: CandidateProfile | null) {
    if (typeof window !== 'undefined') {
      if (p) {
        localStorage.setItem('jh_profile', JSON.stringify(p));
      } else {
        localStorage.removeItem('jh_profile');
      }
    }
  },
  getResumeText(): string {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('jh_resume_text') || 'Experienced Software Engineer. Built FastAPI backend services, Dockerized microservices, and integrated LLM workflows using LangChain and vector databases.';
    }
    return '';
  },
  setResumeText(txt: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jh_resume_text', txt);
    }
  },
  getLastMatches(): MatchResult[] {
    try {
      if (typeof window !== 'undefined') {
        const item = localStorage.getItem('jh_matches');
        return item ? JSON.parse(item) : [];
      }
    } catch {
      return [];
    }
    return [];
  },
  setLastMatches(m: MatchResult[]) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jh_matches', JSON.stringify(m));
    }
  }
};

export function getRealJobUrl(job?: { url?: string | null; company?: string; title?: string } | null): string {
  if (!job) return "https://www.google.com/search?q=tech+jobs";
  if (job.url && !job.url.includes("example.com") && job.url.startsWith("http")) {
    return job.url;
  }
  const query = encodeURIComponent(`${job.company || ""} ${job.title || ""} careers apply`.trim());
  return `https://www.google.com/search?q=${query}`;
}

export interface SearchParams {
  resume_text?: string;
  target_roles?: string[];
  locations?: string[];
  work_mode?: string;
  limit?: number;
}

export const API = {
  async health(): Promise<{ status: string; llm_configured: boolean; adzuna_configured: boolean; langsmith_configured: boolean }> {
    const res = await fetch(`${API_BASE}/api/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    return res.json();
  },

  async searchJobs(params: SearchParams = {}): Promise<{ profile: CandidateProfile; matches: MatchResult[] }> {
    const res = await fetch(`${API_BASE}/api/jobs/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resume_text: params.resume_text || State.getResumeText(),
        target_roles: params.target_roles || ['GenAI Engineer', 'Backend Developer'],
        locations: params.locations || ['Remote'],
        work_mode: params.work_mode || 'any',
        limit: params.limit || 100
      })
    });
    if (!res.ok) throw new Error(`Search failed: ${res.statusText}`);
    const data = await res.json();
    if (data.profile) State.setProfile(data.profile);
    if (data.matches) State.setLastMatches(data.matches);
    return data;
  },

  async tailorJob(jobId: string, jobData: JobPosting | null = null): Promise<TailorResponse> {
    const res = await fetch(`${API_BASE}/api/jobs/tailor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: jobId,
        resume_text: State.getResumeText(),
        profile: State.getProfile(),
        job: jobData
      })
    });
    if (!res.ok) throw new Error(`Tailoring failed: ${res.statusText}`);
    return res.json();
  },

  async prepJob(jobId: string, jobData: JobPosting | null = null): Promise<PrepResponse> {
    const res = await fetch(`${API_BASE}/api/jobs/prep`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: jobId,
        resume_text: State.getResumeText(),
        profile: State.getProfile(),
        job: jobData
      })
    });
    if (!res.ok) throw new Error(`Interview prep failed: ${res.statusText}`);
    return res.json();
  },

  async getDashboard(): Promise<DashboardResponse> {
    const res = await fetch(`${API_BASE}/api/tracker/dashboard`);
    if (!res.ok) throw new Error(`Dashboard fetch failed: ${res.statusText}`);
    return res.json();
  },

  async getApplications(): Promise<Application[]> {
    const res = await fetch(`${API_BASE}/api/tracker/applications`);
    if (!res.ok) throw new Error(`Applications fetch failed: ${res.statusText}`);
    return res.json();
  },

  async trackApplication(appData: Application): Promise<Application> {
    const res = await fetch(`${API_BASE}/api/tracker/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appData)
    });
    if (!res.ok) throw new Error(`Failed to track application: ${res.statusText}`);
    return res.json();
  },

  async updateStage(appId: string | number, status: string): Promise<Application> {
    const res = await fetch(`${API_BASE}/api/tracker/applications/${appId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error(`Failed to update status: ${res.statusText}`);
    return res.json();
  },

  async deleteApplication(appId: string | number): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/api/tracker/applications/${appId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(`Failed to delete application: ${res.statusText}`);
    return res.json();
  },

  async uploadResume(file: File, options: { target_roles?: string; locations?: string; work_mode?: string } = {}): Promise<{ resume_text: string; profile: CandidateProfile }> {
    const fd = new FormData();
    fd.append('file', file);
    if (options.target_roles) fd.append('target_roles', options.target_roles);
    if (options.locations) fd.append('locations', options.locations);
    if (options.work_mode) fd.append('work_mode', options.work_mode);

    const res = await fetch(`${API_BASE}/api/profile/upload`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
    const data = await res.json();
    State.setProfile(data.profile);
    State.setResumeText(data.resume_text);
    return data;
  },

  async chat(message: string): Promise<{ reply: string }> {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    if (!res.ok) throw new Error(`Chat failed: ${res.statusText}`);
    return res.json();
  },

  async applyJob(jobId: string, jobData: JobPosting | null = null, tailoredResume: TailoredResume | null = null): Promise<{ screenshot_base64?: string }> {
    const res = await fetch(`${API_BASE}/api/jobs/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: jobId,
        resume_text: State.getResumeText(),
        profile: State.getProfile(),
        job: jobData,
        tailored_resume: tailoredResume
      })
    });
    if (!res.ok) throw new Error(`Auto-fill failed: ${res.statusText}`);
    return res.json();
  },

  async learnJob(jobId: string, gaps: string[] = [], jobData: JobPosting | null = null): Promise<{ markdown: string }> {
    const res = await fetch(`${API_BASE}/api/jobs/learn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: jobId,
        resume_text: State.getResumeText(),
        profile: State.getProfile(),
        job: jobData,
        gaps
      })
    });
    if (!res.ok) throw new Error(`Learning Path failed: ${res.statusText}`);
    return res.json();
  }
};
