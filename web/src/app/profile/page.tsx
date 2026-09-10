"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { API, State } from "@/lib/api";
import { CandidateProfile } from "@/lib/types";
import { ScoreRing } from "@/components/ui/score-ring";
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
  Sparkles,
} from "lucide-react";

export default function ProfilePage() {
  // localStorage is only available client-side; render a skeleton until mounted
  // to avoid a hydration mismatch between server and first client render.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [profile, setProfile] = useState<CandidateProfile | null>(null);

  const [resumeText, setResumeText] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedProfile = State.getProfile();
    setProfile(storedProfile);
    setResumeText(State.getResumeText());
    if (storedProfile?.target_roles?.length) setTargetRoles(storedProfile.target_roles.join(", "));
    if (storedProfile?.locations?.length) setLocations(storedProfile.locations.join(", "));
    if (storedProfile?.work_mode) setWorkMode(storedProfile.work_mode);
  }, []);

  const [targetRoles, setTargetRoles] = useState<string>("GenAI Engineer, Backend Developer");
  const [locations, setLocations] = useState<string>("Remote, Bangalore");
  const [workMode, setWorkMode] = useState<string>("any");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const [newSkill, setNewSkill] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const completeness = () => {
    let score = 20;
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
  const displaySkills =
    profile?.skills && profile.skills.length > 0
      ? profile.skills
      : ["Python", "FastAPI", "Docker", "LangGraph", "SQL", "Vector Embeddings"];

  const cardVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.55, ease: [0.16, 1, 0.3, 1] as const },
    }),
  };

  return (
    <main className="w-full flex-1 bg-slate-50 min-h-screen py-8 relative overflow-x-clip">
      {/* Ambient aurora */}
      <div className="absolute inset-x-0 top-0 -z-10 h-[380px] overflow-hidden pointer-events-none">
        <div className="animate-blob absolute -top-28 left-1/4 w-[420px] h-[300px] rounded-full bg-violet-200/40 blur-3xl" />
        <div className="animate-blob-delayed absolute -top-20 right-1/4 w-[380px] h-[280px] rounded-full bg-indigo-200/40 blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 relative">
        {/* CANDIDATE PROFILE HEADER CARD */}
        <motion.div
          initial="hidden"
          animate="visible"
          custom={0}
          variants={cardVariants}
          className="rounded-2xl bg-white/75 backdrop-blur-xl border border-violet-100 shadow-[0_8px_30px_-12px_rgba(124,58,237,0.15)] p-6 space-y-6"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-brand-gradient text-white flex items-center justify-center font-heading font-extrabold text-2xl shadow-lg shadow-violet-500/30">
                  {profile?.name ? profile.name.charAt(0).toUpperCase() : "C"}
                </div>
                <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wide border-2 border-white">
                  Open
                </span>
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-heading text-xl font-bold text-slate-900">
                    {profile?.name || "Sooryansh Singh"}
                  </h1>
                </div>
                <p className="text-xs sm:text-sm text-violet-600 font-semibold">
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

            {/* Completeness Ring */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100">
              <ScoreRing score={currentCompleteness} size={56} stroke={5} />
              <div className="space-y-0.5 pr-1">
                <span className="text-xs font-bold text-slate-800 block">Profile Strength</span>
                <span className="text-[10px] text-slate-500 block max-w-[130px] leading-snug">
                  {currentCompleteness === 100
                    ? "Profile complete & optimized"
                    : "Upload resume to maximize matches"}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* RESUME INGESTION DROPZONE */}
        <motion.div
          initial="hidden"
          animate="visible"
          custom={1}
          variants={cardVariants}
          className="rounded-2xl bg-white/75 backdrop-blur-xl border border-violet-100 shadow-[0_8px_30px_-12px_rgba(124,58,237,0.15)] p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="font-heading font-bold text-base text-slate-900 flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-brand-gradient flex items-center justify-center text-white shadow-md shadow-violet-500/25">
                  <UploadCloud className="w-4 h-4" />
                </span>
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
              className={`relative overflow-hidden border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                dragActive
                  ? "border-violet-500 bg-violet-50/70 scale-[1.01]"
                  : "border-violet-200 hover:border-violet-400 bg-white/50 hover:bg-violet-50/30"
              }`}
            >
              {dragActive && (
                <div className="absolute inset-0 bg-gradient-to-br from-violet-100/50 to-fuchsia-100/50 pointer-events-none" />
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="space-y-3 relative">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto transition-all duration-300 ${
                    selectedFile
                      ? "bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 scale-110"
                      : dragActive
                        ? "bg-brand-gradient text-white shadow-lg shadow-violet-500/30 scale-110"
                        : "bg-violet-50 text-violet-400"
                  }`}
                >
                  {selectedFile ? (
                    <CheckCircle2 className="w-7 h-7" />
                  ) : (
                    <FileText className="w-7 h-7" />
                  )}
                </div>
                <div className="text-xs font-semibold text-slate-700">
                  {selectedFile ? (
                    <span className="text-violet-700 font-bold">{selectedFile.name}</span>
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
              <span className="text-xs">
                <AnimatePresence>
                  {uploadSuccess && (
                    <motion.span
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-emerald-700 font-semibold flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Parsed successfully! Profile updated.
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
              <button
                type="submit"
                disabled={isUploading || !selectedFile}
                className="relative overflow-hidden px-6 py-2.5 bg-brand-gradient text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:shadow-none"
              >
                {isUploading && <span className="animate-shimmer absolute inset-0" />}
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Extracting Skills...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Parse Document</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>

        {/* SKILLS MANAGER */}
        <motion.div
          initial="hidden"
          animate="visible"
          custom={2}
          variants={cardVariants}
          className="rounded-2xl bg-white/75 backdrop-blur-xl border border-violet-100 shadow-[0_8px_30px_-12px_rgba(124,58,237,0.15)] p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="font-heading font-bold text-base text-slate-900 flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white shadow-md shadow-fuchsia-500/25">
                  <Tag className="w-4 h-4" />
                </span>
                <span>Indexed Skill Set</span>
              </h2>
              <p className="text-xs text-slate-500">
                These verified skills drive your semantic match scores and cover letter grounding.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-violet-50 border border-violet-100 text-xs font-bold text-violet-700">
              {profile?.skills?.length || 0} skills
            </span>
          </div>

          {/* Skill Tag Cloud */}
          <div className="flex flex-wrap gap-2 pt-1">
            <AnimatePresence>
              {displaySkills.map((s) => (
                <motion.span
                  layout
                  key={s}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.25 }}
                  className="group inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-violet-200 text-slate-800 text-xs font-semibold shadow-sm hover:border-violet-400 hover:bg-violet-50 hover:-translate-y-0.5 transition-all"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500" />
                  <span>{s}</span>
                  <button
                    type="button"
                    onClick={() => removeSkill(s)}
                    className="text-slate-300 hover:text-rose-600 font-bold ml-1 opacity-60 group-hover:opacity-100 transition-all"
                  >
                    ×
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>
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
              className="bg-white border border-violet-200/80 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 flex-1 max-w-sm transition-all"
            />
            <button
              type="button"
              onClick={addSkill}
              className="px-4 py-2 bg-brand-gradient hover:shadow-lg hover:shadow-violet-500/30 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-all hover:-translate-y-0.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </motion.div>

        {/* TARGET SEARCH PREFERENCES & RESUME SUMMARY */}
        <motion.div
          initial="hidden"
          animate="visible"
          custom={3}
          variants={cardVariants}
          className="rounded-2xl bg-white/75 backdrop-blur-xl border border-violet-100 shadow-[0_8px_30px_-12px_rgba(124,58,237,0.15)] p-6 space-y-4"
        >
          <div className="space-y-0.5">
            <h2 className="font-heading font-bold text-base text-slate-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
                <Briefcase className="w-4 h-4" />
              </span>
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
                className="w-full bg-violet-50/40 border border-violet-200/70 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Preferred Locations</label>
              <input
                type="text"
                value={locations}
                onChange={(e) => setLocations(e.target.value)}
                className="w-full bg-violet-50/40 border border-violet-200/70 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Work Mode</label>
              <select
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value)}
                className="w-full bg-violet-50/40 border border-violet-200/70 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-violet-500 cursor-pointer transition-all"
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
              className="w-full bg-violet-50/40 border border-violet-200/70 rounded-xl p-3 text-xs text-slate-800 leading-relaxed focus:outline-none focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all custom-scroll"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <AnimatePresence>
                {saveMessage && (
                  <motion.span
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1"
                  >
                    <Check className="w-4 h-4" />
                    {saveMessage}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <button
              type="button"
              onClick={handleSavePreferences}
              className="px-6 py-2.5 bg-brand-gradient text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
