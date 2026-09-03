/**
 * JobHunt Frontend API Client & State Sync
 */
const API_BASE = window.location.origin;

const State = {
  getProfile() {
    try {
      return JSON.parse(localStorage.getItem('jh_profile') || 'null');
    } catch {
      return null;
    }
  },
  setProfile(p) {
    localStorage.setItem('jh_profile', JSON.stringify(p));
  },
  getResumeText() {
    return localStorage.getItem('jh_resume_text') || 'Experienced Python developer. Built FastAPI backend services, Dockerized microservices, and integrated LLM workflows using LangChain and vector databases.';
  },
  setResumeText(txt) {
    localStorage.setItem('jh_resume_text', txt);
  },
  getLastMatches() {
    try {
      return JSON.parse(localStorage.getItem('jh_matches') || '[]');
    } catch {
      return [];
    }
  },
  setLastMatches(m) {
    localStorage.setItem('jh_matches', JSON.stringify(m));
  }
};

const API = {
  async health() {
    const res = await fetch(`${API_BASE}/api/health`);
    return res.json();
  },

  async searchJobs(params = {}) {
    const res = await fetch(`${API_BASE}/api/jobs/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resume_text: params.resume_text || State.getResumeText(),
        target_roles: params.target_roles || ['GenAI Engineer', 'Backend Developer'],
        locations: params.locations || ['Remote'],
        work_mode: params.work_mode || 'any',
        limit: params.limit || 20
      })
    });
    if (!res.ok) throw new Error(`Search failed: ${res.statusText}`);
    const data = await res.json();
    if (data.profile) State.setProfile(data.profile);
    if (data.matches) State.setLastMatches(data.matches);
    return data;
  },

  async tailorJob(jobId, jobData = null) {
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

  async prepJob(jobId, jobData = null) {
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

  async getDashboard() {
    const res = await fetch(`${API_BASE}/api/tracker/dashboard`);
    if (!res.ok) throw new Error(`Dashboard fetch failed: ${res.statusText}`);
    return res.json();
  },

  async getApplications() {
    const res = await fetch(`${API_BASE}/api/tracker/applications`);
    if (!res.ok) throw new Error(`Applications fetch failed: ${res.statusText}`);
    return res.json();
  },

  async trackApplication(appData) {
    const res = await fetch(`${API_BASE}/api/tracker/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appData)
    });
    if (!res.ok) throw new Error(`Failed to track application: ${res.statusText}`);
    return res.json();
  },

  async updateStage(appId, status) {
    const res = await fetch(`${API_BASE}/api/tracker/applications/${appId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error(`Failed to update status: ${res.statusText}`);
    return res.json();
  },

  async deleteApplication(appId) {
    const res = await fetch(`${API_BASE}/api/tracker/applications/${appId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(`Failed to delete application: ${res.statusText}`);
    return res.json();
  },

  async uploadResume(file, options = {}) {
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

  async chat(message) {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    if (!res.ok) throw new Error(`Chat failed: ${res.statusText}`);
    return res.json();
  },

  async applyJob(jobId, jobData = null) {
    const res = await fetch(`${API_BASE}/api/jobs/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: jobId,
        resume_text: State.getResumeText(),
        profile: State.getProfile(),
        job: jobData
      })
    });
    if (!res.ok) throw new Error(`Auto-fill failed: ${res.statusText}`);
    return res.json();
  },

  async learnJob(jobId, gaps = [], jobData = null) {
    const res = await fetch(`${API_BASE}/api/jobs/learn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: jobId,
        resume_text: State.getResumeText(),
        profile: State.getProfile(),
        job: jobData,
        gaps: gaps
      })
    });
    if (!res.ok) throw new Error(`Learning Path failed: ${res.statusText}`);
    return res.json();
  }
};
