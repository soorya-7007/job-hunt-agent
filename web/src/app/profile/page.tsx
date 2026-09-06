"use client";

import { useState, useRef } from "react";
import { API, State } from "@/lib/api";
import { CandidateProfile } from "@/lib/types";
import {
  UploadCloud,
  CheckCircle2,
  FileText,
  Briefcase,
  MapPin,
  Tag,
  Loader2,
  Check,
  Save,
  Plus,
} from "lucide-react";

export default function ProfilePage() {
  const [profile, setProfile] = useState<CandidateProfile | null>(() => {
    if (typeof window !== "undefined") {
      return State.getProfile();
    }
    return null;
  });

  const [resumeText, setResumeText] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return State.getResumeText();
    }
    return "";
  });

  const [targetRoles, setTargetRoles] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const p = State.getProfile();
      if (p?.target_roles?.length) return p.target_roles.join(", ");
    }
    return "GenAI Engineer, Backend Developer";
  });

  const [locations, setLocations] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const p = State.getProfile();
      if (p?.locations?.length) return p.locations.join(", ");
    }
    return "Remote, Bangalore";
  });

  const [workMode, setWorkMode] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const p = State.getProfile();
      if (p?.work_mode) return p.work_mode;
    }
    return "any";
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const [newSkill, setNewSkill] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate profile completeness
  const completeness = () => {
    let score = 20; // base
    if (profile?.name) score += 20;
    if (profile?.skills && profile.skills.length > 0) score += 25;
    if (profile?.target_roles && profile.target_roles.length > 0) score += 20;
    if (resumeText.length > 50) score += 15;
    return Math.min(100, score);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("Please select a PDF or TXT resume file first.");
      return;
    }

    setIsUploading(true);
    setUploadSuccess(false);
    try {
      const res = await API.uploadResume(selectedFile, {
        target_roles: targetRoles,
        locations: locations,
        work_mode: workMode,
      });
      setProfile(res.profile);
      setResumeText(res.resume_text);
      setSelectedFile(null);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 4000);
    } catch (err: unknown) {
      alert("Upload failed: " + (err instanceof Error ? err.message : "Error"));
    } finally {
      setIsUploading(false);
    }
  };

  const addSkill = () => {
    const trimmed = newSkill.trim();
    if (!trimmed) return;
    const currentSkills = profile?.skills || [];
    if (!currentSkills.includes(trimmed)) {
      const updatedProfile: CandidateProfile = {
        ...(profile || { summary: "", target_roles: [], locations: [] }),
        skills: [...currentSkills, trimmed],
      };
      setProfile(updatedProfile);
      State.setProfile(updatedProfile);
      setNewSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    if (!profile) return;
    const updatedProfile: CandidateProfile = {
      ...profile,
      skills: (profile.skills || []).filter((s) => s !== skillToRemove),
    };
    setProfile(updatedProfile);
    State.setProfile(updatedProfile);
  };

  const handleSavePreferences = () => {
    const updatedProfile: CandidateProfile = {
      ...(profile || { summary: "", skills: [] }),
      target_roles: targetRoles.split(",").map((r) => r.trim()).filter(Boolean),
      locations: locations.split(",").map((l) => l.trim()).filter(Boolean),
      work_mode: workMode as "remote" | "hybrid" | "onsite" | "any",
      summary: resumeText,
    };
    setProfile(updatedProfile);
    State.setProfile(updatedProfile);
    State.setResumeText(resumeText);
    setSaveMessage("Preferences saved successfully!");
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const currentCompleteness = completeness();

  return (
    <main className="w-full flex-1 bg-slate-50 min-h-screen py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* CANDIDATE PROFILE HEADER CARD */}
        <div className="card-subtle rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-heading font-extrabold text-2xl shadow-xs">
                {profile?.name ? profile.name.charAt(0).toUpperCase() : "C"}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h1 className="font-heading text-xl font-bold text-slate-900">
                    {profile?.name || "Sooryansh Singh"}
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                    Open to Work
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  {profile?.target_roles?.join(" · ") || "Software Engineer · Python · GenAI"}
                </p>
                <div className="flex items-center gap-3 text-xs text-slate-400 pt-0.5">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {profile?.locations?.join(", ") || "Remote"}
                  </span>
                  <span>·</span>
                  <span>{profile?.skills?.length || 0} indexed skills</span>
                </div>
              </div>
            </div>

            {/* Completeness Meter */}
            <div className="w-full sm:w-48 space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>Profile Strength</span>
                <span className="text-blue-600">{currentCompleteness}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${currentCompleteness}%` }}
                ></div>
              </div>
              <span className="text-[10px] text-slate-500 block">
                {currentCompleteness === 100
                  ? "Profile complete & optimized"
                  : "Upload resume to maximize matches"}
              </span>
            </div>
          </div>
        </div>

        {/* RESUME INGESTION DROPZONE */}
        <div className="card-subtle rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="font-heading font-bold text-base text-slate-900 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-blue-600" />
                <span>Upload & Parse Resume</span>
              </h2>
              <p className="text-xs text-slate-500">
                Upload your latest resume (.PDF or .TXT) to extract factual skills and ground our tailoring agent.
              </p>
            </div>
          </div>

          <form onSubmit={handleUpload} className="space-y-4">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                dragActive
                  ? "border-blue-600 bg-blue-50/50"
                  : "border-slate-300 hover:border-slate-400 bg-slate-50/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="space-y-2 max-w-xs mx-auto">
                <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="text-xs font-semibold text-slate-700">
                  {selectedFile ? (
                    <span className="text-blue-600 font-bold">{selectedFile.name}</span>
                  ) : (
                    <span>Click to browse or drag and drop your file</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 block">
                  PDF or Plain Text up to 10MB
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-500">
                {uploadSuccess && (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Parsed successfully! Profile and skills updated.
                  </span>
                )}
              </span>
              <button
                type="submit"
                disabled={isUploading || !selectedFile}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Extracting Skills...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Parse Document</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* SKILLS MANAGER */}
        <div className="card-subtle rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="font-heading font-bold text-base text-slate-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-blue-600" />
                <span>Indexed Skill Set</span>
              </h2>
              <p className="text-xs text-slate-500">
                These verified skills drive your semantic match scores and cover letter grounding.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {profile?.skills?.length || 0} skills
            </span>
          </div>

          {/* Skill Tag Cloud */}
          <div className="flex flex-wrap gap-2 pt-1">
            {(profile?.skills && profile.skills.length > 0
              ? profile.skills
              : ["Python", "FastAPI", "Docker", "LangGraph", "SQL", "Vector Embeddings"]
            ).map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold"
              >
                <span>{s}</span>
                <button
                  type="button"
                  onClick={() => removeSkill(s)}
                  className="text-slate-400 hover:text-rose-600 font-bold ml-1"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          {/* Add Skill Input */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="text"
              placeholder="Add skill (e.g. Next.js, Kubernetes)..."
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill();
                }
              }}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 flex-1 max-w-sm"
            />
            <button
              type="button"
              onClick={addSkill}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* TARGET SEARCH PREFERENCES & RESUME SUMMARY */}
        <div className="card-subtle rounded-2xl p-6 space-y-4">
          <div className="space-y-0.5">
            <h2 className="font-heading font-bold text-base text-slate-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-600" />
              <span>Target Role Preferences</span>
            </h2>
            <p className="text-xs text-slate-500">
              Set default job titles and locations used by our search agent.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Target Roles (comma-separated)</label>
              <input
                type="text"
                value={targetRoles}
                onChange={(e) => setTargetRoles(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Preferred Locations</label>
              <input
                type="text"
                value={locations}
                onChange={(e) => setLocations(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Work Mode</label>
              <select
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 cursor-pointer"
              >
                <option value="any">Any Mode</option>
                <option value="remote">Remote Only</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-site</option>
              </select>
            </div>
          </div>

          <div className="space-y-1 pt-2">
            <label className="text-xs font-bold text-slate-700">
              Source Resume Summary (Fact Grounding for Critic)
            </label>
            <textarea
              rows={4}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs text-slate-800 leading-relaxed focus:outline-none focus:bg-white focus:border-blue-600"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              {saveMessage && (
                <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  {saveMessage}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleSavePreferences}
              className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
