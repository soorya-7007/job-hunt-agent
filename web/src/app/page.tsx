"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
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
  Upload,
  BrainCircuit,
  Trophy,
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

const HOW_IT_WORKS = [
  {
    icon: Upload,
    step: "01",
    title: "Upload Your Resume",
    desc: "Drop in your PDF or DOCX. Our profile agent extracts your real skills and experience in seconds.",
    color: "from-indigo-500 to-violet-500",
  },
  {
    icon: BrainCircuit,
    step: "02",
    title: "Get Semantic Matches",
    desc: "Jobs are ranked by meaning, not keywords — with honest fit scores and clear gap analysis.",
    color: "from-violet-500 to-fuchsia-500",
  },
  {
    icon: Trophy,
    step: "03",
    title: "Apply With Confidence",
    desc: "Fact-grounded tailored resumes, cover letters, and interview prep — tracked in one pipeline.",
    color: "from-fuchsia-500 to-rose-500",
  },
];

const SAMPLE_FEATURED_JOBS = [
  {
    title: "Senior Python & GenAI Engineer",
    company: "Scale Systems",
    location: "Bangalore (Hybrid)",
    salary: "₹28L - ₹38L",
    mode: "Hybrid",
    fit: 94,
    tags: ["Python", "FastAPI", "LangChain", "Vector DB"],
  },
  {
    title: "Full Stack Backend Architect",
    company: "CloudCore Tech",
    location: "Remote",
    salary: "₹32L - ₹45L",
    mode: "Remote",
    fit: 91,
    tags: ["Node.js", "PostgreSQL", "Docker", "Microservices"],
  },
  {
    title: "AI Infrastructure Specialist",
    company: "Apex Labs",
    location: "Pune (On-site)",
    salary: "₹24L - ₹34L",
    mode: "On-site",
    fit: 88,
    tags: ["Kubernetes", "Python", "GPU Orchestration", "CI/CD"],
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 15;
  return (
    <div className="relative w-12 h-12 shrink-0">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15" fill="none" stroke="#ede9fe" strokeWidth="3.5" />
        <motion.circle
          cx="18"
          cy="18"
          r="15"
          fill="none"
          stroke="url(#scoreGrad)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          whileInView={{ strokeDashoffset: circumference * (1 - score / 100) }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold text-violet-700">
        {score}
      </span>
    </div>
  );
}

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

  const persistSearch = (roles: string[], locs: string[]) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("search_roles", JSON.stringify(roles));
      sessionStorage.setItem("search_locations", JSON.stringify(locs));
      sessionStorage.setItem("search_work_mode", workMode);
    }
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    const finalRole = role.trim();
    const rolesArray = finalRole ? [finalRole] : ["GenAI Engineer", "Backend Developer"];
    const locsArray = location.trim() ? [location.trim()] : ["Remote"];
    persistSearch(rolesArray, locsArray);
    router.push("/jobs");
  };

  const quickSearch = (qRole: string) => {
    setRole(qRole);
    persistSearch([qRole], location.trim() ? [location.trim()] : ["Remote"]);
    setIsSubmitting(true);
    router.push("/jobs");
  };

  return (
    <main className="w-full flex-1 flex flex-col overflow-x-clip">
      {/* ============ HERO ============ */}
      <section className="relative pt-20 pb-24 px-4 sm:px-6 lg:px-8">
        {/* Aurora background */}
        <div className="absolute inset-0 -z-10 bg-grid" />
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="animate-blob absolute -top-32 -left-24 w-[480px] h-[480px] rounded-full bg-violet-300/35 blur-3xl" />
          <div className="animate-blob-delayed absolute -top-20 right-0 w-[420px] h-[420px] rounded-full bg-indigo-300/35 blur-3xl" />
          <div className="animate-blob absolute top-40 left-1/2 -translate-x-1/2 w-[380px] h-[380px] rounded-full bg-fuchsia-200/40 blur-3xl [animation-delay:4s]" />
        </div>

        <div className="max-w-5xl mx-auto text-center space-y-8">

          {/* Status Chip */}
          <motion.div initial="hidden" animate="visible" custom={0} variants={fadeUp}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur border border-violet-200/70 text-slate-700 text-xs font-semibold shadow-sm">
              <span className="relative flex w-2 h-2">
                <span className="animate-ping absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500"></span>
              </span>
              <span>Live Semantic Discovery & Fact-Grounded Tailoring</span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.div
            initial="hidden"
            animate="visible"
            custom={1}
            variants={fadeUp}
            className="space-y-5"
          >
            <h1 className="font-heading text-4xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.05]">
              Find the right job.
              <br />
              <span className="text-gradient animate-gradient-x">Apply with precision.</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
              Explore curated positions matched against your actual resume skills. Get honest fit
              scores, zero-fabrication resume tailoring, and interview guides.
            </p>
          </motion.div>

          {/* Search Command Bar */}
          <motion.form
            onSubmit={handleSearch}
            initial="hidden"
            animate="visible"
            custom={2}
            variants={fadeUp}
            className="relative w-full max-w-4xl mx-auto"
          >
            <div className="absolute -inset-1 bg-brand-gradient rounded-[1.4rem] opacity-20 blur-lg -z-10 group-focus-within:opacity-40 transition-opacity" />
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-violet-200/80 shadow-xl shadow-violet-500/10 p-2 flex flex-col md:flex-row items-center gap-2 text-left transition-all focus-within:border-violet-400 focus-within:shadow-2xl focus-within:shadow-violet-500/20">
              {/* Segment 1: Role */}
              <div className="flex-1 w-full flex items-center px-4 py-2.5 rounded-xl hover:bg-violet-50/60 focus-within:bg-violet-50/60 transition-colors">
                <Search className="text-violet-400 w-5 h-5 mr-3 shrink-0" />
                <div className="flex flex-col w-full min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-violet-500 mb-0.5">
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

              <div className="hidden md:block h-9 w-px bg-violet-100 shrink-0"></div>

              {/* Segment 2: Location */}
              <div className="flex-1 w-full flex items-center px-4 py-2.5 rounded-xl hover:bg-violet-50/60 focus-within:bg-violet-50/60 transition-colors">
                <MapPin className="text-violet-400 w-5 h-5 mr-3 shrink-0" />
                <div className="flex flex-col w-full min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-violet-500 mb-0.5">
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

              <div className="hidden md:block h-9 w-px bg-violet-100 shrink-0"></div>

              {/* Segment 3: Work Mode */}
              <div className="w-full md:w-44 flex items-center px-4 py-2.5 rounded-xl hover:bg-violet-50/60 focus-within:bg-violet-50/60 transition-colors">
                <Briefcase className="text-violet-400 w-5 h-5 mr-3 shrink-0" />
                <div className="flex flex-col w-full min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-violet-500 mb-0.5">
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

              {/* Submit */}
              <button
                disabled={isSubmitting}
                className="relative overflow-hidden w-full md:w-auto px-7 py-3.5 bg-brand-gradient text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:-translate-y-0.5 active:translate-y-0 transition-all shrink-0 disabled:opacity-70"
                type="submit"
              >
                {isSubmitting && <span className="animate-shimmer absolute inset-0" />}
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
            </div>
          </motion.form>

          {/* Quick Keywords Ribbon */}
          <motion.div
            initial="hidden"
            animate="visible"
            custom={3}
            variants={fadeUp}
            className="flex flex-wrap items-center justify-center gap-2 pt-2"
          >
            <span className="text-xs text-slate-500 font-medium mr-1">Trending Roles:</span>
            {ROLE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => quickSearch(preset)}
                className="px-3 py-1 bg-white/80 backdrop-blur hover:bg-violet-50 border border-violet-100 hover:border-violet-300 rounded-full text-xs font-medium text-slate-700 hover:text-violet-700 transition-all hover:-translate-y-0.5"
              >
                {preset}
              </button>
            ))}
          </motion.div>

          {/* Personalized Banner if Profile Loaded */}
          {existingProfile && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-2xl mx-auto pt-4"
            >
              <div className="bg-white/80 backdrop-blur border border-violet-200/80 rounded-xl p-3.5 flex items-center justify-between gap-4 text-left shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-gradient text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-md shadow-violet-500/25">
                    {existingProfile.name ? existingProfile.name.charAt(0).toUpperCase() : "P"}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block">
                      Active Profile: {existingProfile.name || "Candidate"}
                    </span>
                    <span className="text-[11px] text-violet-700 font-medium">
                      {existingProfile.skills?.length || 0} extracted skills · Ready for instant matching
                    </span>
                  </div>
                </div>
                <Link
                  href="/jobs"
                  className="text-xs font-bold text-violet-700 hover:text-violet-900 flex items-center gap-1 shrink-0 group"
                >
                  <span>View Matches</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-14 space-y-3"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 border border-violet-100 text-violet-700 text-[11px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            How it works
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Your hunt, <span className="text-gradient">supercharged in 3 steps</span>
          </h2>
          <p className="text-sm sm:text-base text-slate-600 font-normal">
            From raw resume to signed offer — a guided pipeline, not a black box.
          </p>
        </motion.div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Connector line (desktop) */}
          <div className="hidden md:block absolute top-16 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-indigo-200 via-violet-200 to-fuchsia-200 -z-0" />
          {HOW_IT_WORKS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: idx * 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="card-glow relative rounded-2xl p-6 flex flex-col items-center text-center space-y-4"
              >
                <div className="relative">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white shadow-lg shadow-violet-500/25`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border border-violet-200 text-[10px] font-extrabold text-violet-700 flex items-center justify-center shadow-sm">
                    {step.step}
                  </span>
                </div>
                <h3 className="font-heading text-lg font-bold text-slate-900">{step.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed font-normal">{step.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ============ CORE CAPABILITIES ============ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white border-y border-violet-100/60 relative overflow-hidden">
        <div className="animate-blob absolute -bottom-40 -right-32 w-[420px] h-[420px] rounded-full bg-violet-200/30 blur-3xl" />
        <div className="max-w-7xl mx-auto w-full relative">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto mb-14 space-y-3"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-bold uppercase tracking-wider">
              <Target className="w-3.5 h-3.5" />
              Core Capabilities
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Engineered for <span className="text-gradient">serious job hunters</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-normal">
              No empty buzzwords. Every feature is built around the real workflow of landing interviews.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Target,
                gradient: "from-indigo-500 to-violet-500",
                title: "Semantic Vector Match",
                desc: "Roles are ranked using semantic similarity embeddings, not keyword counting. You see exact percentage scores and clear reasons why you fit.",
                points: ["Transparent fit percentage", "Explicit skill gap identification"],
              },
              {
                icon: ShieldCheck,
                gradient: "from-violet-500 to-fuchsia-500",
                title: "Zero-Fabrication Critic",
                desc: "An adversarial critic agent double-checks every drafted bullet against your real resume. Never get caught with fabricated claims.",
                points: ["Strict verification loop", "Cover letters grounded in facts"],
              },
              {
                icon: BookmarkCheck,
                gradient: "from-fuchsia-500 to-rose-500",
                title: "Application Pipeline",
                desc: "A structured pipeline from Saved to Tailored, Applied, Interview, and Offer — with company-specific prep sheets along the way.",
                points: ["SQLite persistent tracker", "Custom interview guides & Q&A"],
              },
            ].map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <motion.div
                  key={pillar.title}
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: idx * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="card-glow rounded-2xl p-6 flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${pillar.gradient} flex items-center justify-center text-white shadow-lg shadow-violet-500/20`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-heading text-lg font-bold text-slate-900">{pillar.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed font-normal">{pillar.desc}</p>
                  </div>
                  <ul className="text-xs text-slate-500 space-y-1.5 pt-3 border-t border-violet-100/80">
                    {pillar.points.map((p) => (
                      <li key={p} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ FEATURED ROLES ============ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10"
        >
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-violet-600" />
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Featured high-fit roles
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1">
              Preview sample ranked opportunities from our live search index.
            </p>
          </div>
          <Link
            href="/jobs"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-violet-700 hover:text-violet-900"
          >
            <span>Explore All Jobs</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SAMPLE_FEATURED_JOBS.map((job, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: idx * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -6 }}
              onClick={() => quickSearch(job.title.split(" ")[0])}
              className={`card-glow rounded-2xl p-5 cursor-pointer flex flex-col justify-between space-y-4 ${idx === 1 ? "md:-translate-y-3" : ""}`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-violet-600">{job.company}</span>
                    <h3 className="font-heading text-base font-bold text-slate-900 mt-0.5 leading-snug">
                      {job.title}
                    </h3>
                    <span className="text-xs text-slate-500">{job.location}</span>
                  </div>
                  <ScoreRing score={job.fit} />
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded-md border border-violet-100">
                    {job.salary}
                  </span>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">
                    {job.mode}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-violet-100/80">
                {job.tags.map((t) => (
                  <span
                    key={t}
                    className="text-[11px] font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200/70"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full text-center">
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-3xl bg-brand-gradient animate-gradient-x p-8 sm:p-14 space-y-6 shadow-2xl shadow-violet-500/30"
        >
          <div className="animate-blob absolute -top-24 -right-16 w-72 h-72 rounded-full bg-white/15 blur-2xl" />
          <div className="animate-blob-delayed absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-fuchsia-300/25 blur-2xl" />

          <div className="relative space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur text-white text-xs font-semibold border border-white/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ready to step up your search?</span>
            </div>
            <h2 className="font-heading text-2xl sm:text-4xl font-extrabold text-white tracking-tight max-w-2xl mx-auto leading-tight">
              Stop sending generic applications. Start matching with proof.
            </h2>
            <p className="text-sm sm:text-base text-violet-100 max-w-lg mx-auto font-normal">
              Upload your resume or start exploring live job openings with semantic search.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/jobs"
                className="group w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white text-violet-700 text-sm font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
              >
                Search Open Roles
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/profile"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white/10 backdrop-blur hover:bg-white/20 text-white text-sm font-semibold border border-white/25 transition-all"
              >
                Upload Resume First
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="mt-auto border-t border-violet-100 bg-white py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">JobHunt Platform</span>
            <span>·</span>
            <span>Intelligent Career Agent</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/jobs" className="hover:text-violet-700 transition-colors">Jobs</Link>
            <Link href="/dashboard" className="hover:text-violet-700 transition-colors">Applications</Link>
            <Link href="/chat" className="hover:text-violet-700 transition-colors">AI Assistant</Link>
            <Link href="/profile" className="hover:text-violet-700 transition-colors">Profile</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
