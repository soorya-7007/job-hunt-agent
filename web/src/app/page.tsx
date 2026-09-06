"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  MapPin,
  Briefcase,
  ArrowRight,
  ShieldCheck,
  Target,
  Sparkles,
  CheckCircle2,
  BookmarkCheck,
  TrendingUp,
} from "lucide-react";
import { State } from "@/lib/api";

function subscribe(callback: () => void) {
  if (typeof window !== "undefined") {
    window.addEventListener("storage", callback);
    return () => window.removeEventListener("storage", callback);
  }
  return () => {};
}

const ROLE_PRESETS = [
  "Backend Developer",
  "GenAI Engineer",
  "Full Stack Developer",
  "Data Scientist",
  "DevOps Engineer",
  "Software Engineer",
];

const SAMPLE_FEATURED_JOBS = [
  {
    title: "Senior Python & GenAI Engineer",
    company: "Scale Systems",
    location: "Bangalore (Hybrid)",
    salary: "₹28L - ₹38L",
    mode: "Hybrid",
    fit: "94% Match",
    tags: ["Python", "FastAPI", "LangChain", "Vector DB"],
  },
  {
    title: "Full Stack Backend Architect",
    company: "CloudCore Tech",
    location: "Remote",
    salary: "₹32L - ₹45L",
    mode: "Remote",
    fit: "91% Match",
    tags: ["Node.js", "PostgreSQL", "Docker", "Microservices"],
  },
  {
    title: "AI Infrastructure Specialist",
    company: "Apex Labs",
    location: "Pune (On-site)",
    salary: "₹24L - ₹34L",
    mode: "On-site",
    fit: "88% Match",
    tags: ["Kubernetes", "Python", "GPU Orchestration", "CI/CD"],
  },
];

export default function Home() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("Remote");
  const [workMode, setWorkMode] = useState("any");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const existingProfile = useSyncExternalStore(
    subscribe,
    () => State.getProfile(),
    () => null
  );

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);

    const finalRole = role.trim();
    const rolesArray = finalRole ? [finalRole] : ["GenAI Engineer", "Backend Developer"];
    const locsArray = location.trim() ? [location.trim()] : ["Remote"];

    if (typeof window !== "undefined") {
      sessionStorage.setItem("search_roles", JSON.stringify(rolesArray));
      sessionStorage.setItem("search_locations", JSON.stringify(locsArray));
      sessionStorage.setItem("search_work_mode", workMode);
    }

    router.push("/jobs");
  };

  const quickSearch = (qRole: string) => {
    setRole(qRole);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("search_roles", JSON.stringify([qRole]));
      sessionStorage.setItem("search_locations", JSON.stringify([location]));
      sessionStorage.setItem("search_work_mode", workMode);
    }
    setIsSubmitting(true);
    router.push("/jobs");
  };

  return (
    <main className="w-full flex-1 flex flex-col">
      {/* HERO & DUAL SEARCH SECTION */}
      <section className="bg-white border-b border-slate-200/80 pt-16 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          
          {/* Status Chip */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Semantic Discovery & Fact-Grounded Tailoring</span>
          </div>

          {/* Clean, High-Contrast Typography */}
          <div className="space-y-4">
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
              Find the right job. <br />
              <span className="text-blue-600">Apply with precision.</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
              Explore curated positions matched against your actual resume skills. Get honest fit scores, zero-fabrication resume tailoring, and interview guides.
            </p>
          </div>

          {/* Unified High-Utility Search Bar */}
          <form
            onSubmit={handleSearch}
            className="w-full max-w-4xl mx-auto bg-white rounded-2xl border border-slate-300 shadow-sm p-2 flex flex-col md:flex-row items-center gap-2 text-left hover:border-slate-400 transition-colors"
          >
            {/* Segment 1: Role / Keyword */}
            <div className="flex-1 w-full flex items-center px-4 py-2.5 rounded-xl hover:bg-slate-50 focus-within:bg-slate-50 transition-colors">
              <Search className="text-slate-400 w-5 h-5 mr-3 shrink-0" />
              <div className="flex flex-col w-full min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-0.5">
                  Job Title / Keywords
                </span>
                <input
                  className="bg-transparent text-slate-900 text-sm font-medium focus:outline-none w-full placeholder:text-slate-400"
                  placeholder="e.g. Backend Developer, Python"
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                />
              </div>
            </div>

            <div className="hidden md:block h-9 w-px bg-slate-200 shrink-0"></div>

            {/* Segment 2: Location */}
            <div className="flex-1 w-full flex items-center px-4 py-2.5 rounded-xl hover:bg-slate-50 focus-within:bg-slate-50 transition-colors">
              <MapPin className="text-slate-400 w-5 h-5 mr-3 shrink-0" />
              <div className="flex flex-col w-full min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-0.5">
                  Location
                </span>
                <input
                  className="bg-transparent text-slate-900 text-sm font-medium focus:outline-none w-full placeholder:text-slate-400"
                  placeholder="City or Remote (e.g. Bangalore)"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>

            <div className="hidden md:block h-9 w-px bg-slate-200 shrink-0"></div>

            {/* Segment 3: Work Mode */}
            <div className="w-full md:w-44 flex items-center px-4 py-2.5 rounded-xl hover:bg-slate-50 focus-within:bg-slate-50 transition-colors">
              <Briefcase className="text-slate-400 w-5 h-5 mr-3 shrink-0" />
              <div className="flex flex-col w-full min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-0.5">
                  Work Mode
                </span>
                <select
                  className="bg-transparent text-slate-900 text-sm font-medium focus:outline-none cursor-pointer w-full"
                  value={workMode}
                  onChange={(e) => setWorkMode(e.target.value)}
                >
                  <option value="any">Any Mode</option>
                  <option value="remote">Remote Only</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">On-site</option>
                </select>
              </div>
            </div>

            {/* Submit Action */}
            <button
              disabled={isSubmitting}
              className="w-full md:w-auto px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors shrink-0 disabled:opacity-70"
              type="submit"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full"></span>
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <span>Search Jobs</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Keywords Ribbon */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="text-xs text-slate-500 font-medium mr-1">Trending Roles:</span>
            {ROLE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => quickSearch(preset)}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-full text-xs font-medium text-slate-700 transition-colors"
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Personalized Banner if Profile Loaded */}
          {existingProfile && (
            <div className="max-w-2xl mx-auto pt-4">
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 flex items-center justify-between gap-4 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {existingProfile.name ? existingProfile.name.charAt(0).toUpperCase() : "P"}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-blue-950 block">
                      Active Profile: {existingProfile.name || "Candidate"}
                    </span>
                    <span className="text-[11px] text-blue-700 font-medium">
                      {existingProfile.skills?.length || 0} extracted skills · Ready for instant matching
                    </span>
                  </div>
                </div>
                <Link
                  href="/jobs"
                  className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 shrink-0"
                >
                  <span>View Matches</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CORE CAPABILITIES: SYSTEMATIC 3-PILLAR SECTION */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Engineered for Job Hunters
          </h2>
          <p className="text-sm sm:text-base text-slate-600 font-normal">
            No empty buzzwords. Every feature is built around the real workflow of landing interviews.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pillar 1 */}
          <div className="card-subtle rounded-2xl p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="font-heading text-lg font-bold text-slate-900">
                1. Semantic Vector Match
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                Instead of simple keyword matching, roles are ranked using semantic similarity embeddings. You see exact percentage scores and clear reasons why you fit.
              </p>
            </div>
            <ul className="text-xs text-slate-500 space-y-1.5 pt-2 border-t border-slate-100">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Transparent fit percentage</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Explicit skill gap identification</span>
              </li>
            </ul>
          </div>

          {/* Pillar 2 */}
          <div className="card-subtle rounded-2xl p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-heading text-lg font-bold text-slate-900">
                2. Zero-Fabrication Critic
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                Resume tailoring uses an adversarial critic agent that double-checks every drafted bullet point against your real resume. Never get caught with fabricated claims.
              </p>
            </div>
            <ul className="text-xs text-slate-500 space-y-1.5 pt-2 border-t border-slate-100">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Strict verification loop</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tailored cover letters grounded in facts</span>
              </li>
            </ul>
          </div>

          {/* Pillar 3 */}
          <div className="card-subtle rounded-2xl p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <BookmarkCheck className="w-5 h-5" />
              </div>
              <h3 className="font-heading text-lg font-bold text-slate-900">
                3. Application Pipeline
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                Organize your hunt with a structured pipeline from Saved to Tailored, Applied, Interview, and Offer. Accompanied by company-specific prep sheets.
              </p>
            </div>
            <ul className="text-xs text-slate-500 space-y-1.5 pt-2 border-t border-slate-100">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>SQLite persistent tracker</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Custom interview guides & Q&A</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* FEATURED ROLES PREVIEW (INSTANT UTILITY) */}
      <section className="py-12 bg-white border-y border-slate-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <h2 className="font-heading text-xl sm:text-2xl font-bold text-slate-900">
                  Featured High-Fit Roles
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
                Preview sample ranked opportunities from our live search index.
              </p>
            </div>
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              <span>Explore All Jobs</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SAMPLE_FEATURED_JOBS.map((job, idx) => (
              <div
                key={idx}
                onClick={() => quickSearch(job.title.split(" ")[0])}
                className="card-subtle rounded-xl p-5 cursor-pointer flex flex-col justify-between space-y-4 hover:border-blue-300"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold text-slate-500">{job.company}</span>
                      <h3 className="font-heading text-base font-bold text-slate-900 mt-0.5 leading-snug">
                        {job.title}
                      </h3>
                      <span className="text-xs text-slate-500">{job.location}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      {job.fit}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 border border-slate-200">
                      {job.salary}
                    </span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">
                      {job.mode}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                  {job.tags.map((t, i) => (
                    <span key={i} className="text-[11px] font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA STRIP */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full text-center space-y-6">
        <div className="bg-slate-900 text-white rounded-2xl p-8 sm:p-12 space-y-6 shadow-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Ready to step up your search?</span>
          </div>
          <h2 className="font-heading text-2xl sm:text-4xl font-extrabold tracking-tight max-w-xl mx-auto leading-tight">
            Stop sending generic applications. Start matching with proof.
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto font-normal">
            Upload your resume or start exploring live job openings with semantic search.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/jobs"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-xs transition-colors"
            >
              Search Open Roles
            </Link>
            <Link
              href="/profile"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold border border-slate-700 transition-colors"
            >
              Upload Resume First
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">JobHunt Platform</span>
            <span>·</span>
            <span>Intelligent Career Agent</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/jobs" className="hover:text-slate-900 transition-colors">Jobs</Link>
            <Link href="/dashboard" className="hover:text-slate-900 transition-colors">Applications</Link>
            <Link href="/chat" className="hover:text-slate-900 transition-colors">AI Assistant</Link>
            <Link href="/profile" className="hover:text-slate-900 transition-colors">Profile</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
