"use client";

import { useReactToPrint } from "react-to-print";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { API, State, getRealJobUrl } from "@/lib/api";
import {
  JobPosting,
  MatchResult,
  TailorResponse,
  PrepResponse,
  Application,
} from "@/lib/types";
import { ScoreRing } from "@/components/ui/score-ring";
import {
  Search,
  MapPin,
  Briefcase,
  SlidersHorizontal,
  Filter,
  CheckCircle2,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  FileEdit,
  GraduationCap,
  Download,
  Loader2,
  RotateCcw,
  Building2,
  Copy,
  Send,
  Check,
  Brain,
  Layers,
  Wand2,
} from "lucide-react";

const POPULAR_ROLES = [
  "Software Engineer",
  "Backend Developer",
  "Frontend Developer",
  "Full Stack Developer",
  "Data Scientist",
  "GenAI Engineer",
  "DevOps Engineer",
  "Product Manager",
];

const POPULAR_LOCATIONS = [
  "Remote",
  "Bangalore",
  "Hyderabad",
  "Pune",
  "Mumbai",
  "Delhi NCR",
];

const AVATAR_GRADIENTS = [
  "from-indigo-500 to-violet-500",
  "from-violet-500 to-fuchsia-500",
  "from-fuchsia-500 to-rose-500",
  "from-sky-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-rose-500",
];

function gradientForCompany(company: string) {
  let hash = 0;
  for (let i = 0; i < company.length; i++) hash = (hash * 31 + company.charCodeAt(i)) | 0;
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function AgentLoader({
  title,
  subtitle,
  accent = "violet",
}: {
  title: string;
  subtitle: string;
  accent?: "violet" | "indigo" | "amber";
}) {
  const dotColor =
    accent === "indigo" ? "bg-indigo-500" : accent === "amber" ? "bg-amber-500" : "bg-violet-500";
  return (
    <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-2xl bg-brand-gradient opacity-20 animate-ping" />
        <div className="relative w-16 h-16 rounded-2xl bg-brand-gradient flex items-center justify-center text-white shadow-lg shadow-violet-500/30">
          <Wand2 className="w-7 h-7" />
        </div>
      </div>
      <h4 className="font-heading font-bold text-slate-900 text-base">{title}</h4>
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${dotColor} animate-bounce [animation-delay:0ms]`} />
        <span className={`w-2 h-2 rounded-full ${dotColor} animate-bounce [animation-delay:150ms]`} />
        <span className={`w-2 h-2 rounded-full ${dotColor} animate-bounce [animation-delay:300ms]`} />
      </div>
      <p className="text-xs text-slate-500 max-w-xs leading-relaxed">{subtitle}</p>
    </div>
  );
}

export default function JobsPage() {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["GenAI Engineer", "Backend Developer"]);
  const [roleInput, setRoleInput] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<string[]>(["Remote"]);
  const [workMode, setWorkMode] = useState("any");

  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());

  const [filterJobType, setFilterJobType] = useState<string>("All");
  const [filterExpLevel, setFilterExpLevel] = useState<string>("All");
  const [minFitScore, setMinFitScore] = useState<number>(0);
  const [filterDate, setFilterDate] = useState<string>("All");
  const [filterMinSalary, setFilterMinSalary] = useState<number>(0);
  const [filterCompany, setFilterCompany] = useState<string>("");
  const [showSavedOnly, setShowSavedOnly] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<"details" | "tailoring" | "prep" | "learn">("details");
  const [tailoring, setTailoring] = useState<TailorResponse | null>(null);
  const [isTailoring, setIsTailoring] = useState(false);
  const [prep, setPrep] = useState<PrepResponse | null>(null);
  const [isPrepping, setIsPrepping] = useState(false);
  const [learnPath, setLearnPath] = useState<string | null>(null);
  const [isLearning, setIsLearning] = useState(false);

  const [copiedCoverLetter, setCopiedCoverLetter] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyScreenshot, setApplyScreenshot] = useState<string | null>(null);

  const resumeRef = useRef<HTMLDivElement>(null);

  const downloadResumePdf = useReactToPrint({
    contentRef: resumeRef,
    documentTitle: "Tailored_Resume",
  });
  const resetPanes = () => {
    setTailoring(null);
    setPrep(null);
    setLearnPath(null);
    setApplyScreenshot(null);
    setActiveTab("details");
  };

  const handleSearch = useCallback(async (
    rolesToSearch?: string[],
    locsToSearch?: string[],
    modeToSearch?: string
  ) => {
    const roles = rolesToSearch ?? selectedRoles;
    const locs = locsToSearch ?? selectedLocations;
    const m = modeToSearch ?? workMode;

    if (roles.length === 0 && locs.length === 0) return;

    if (typeof window !== "undefined") {
      sessionStorage.setItem("search_roles", JSON.stringify(roles));
      sessionStorage.setItem("search_locations", JSON.stringify(locs));
      sessionStorage.setItem("search_work_mode", m);
    }

    setIsSearching(true);
    setError(null);
    try {
      const data = await API.searchJobs({
        target_roles: roles,
        locations: locs,
        work_mode: m,
      });
      const results = data.matches || [];
      setMatches(results);
      if (results.length > 0) {
        setSelectedMatch(results[0]);
        setSelectedIndex(0);
        resetPanes();
      } else {
        setSelectedMatch(null);
        setSelectedIndex(-1);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setIsSearching(false);
    }
  }, [selectedRoles, selectedLocations, workMode]);

  useEffect(() => {
    let isMounted = true;

    const initData = async () => {
      try {
        const apps = await API.getApplications();
        if (isMounted) {
          const idSet = new Set<string>();
          apps.forEach((a: Application) => {
            if (a.job_id) idSet.add(a.job_id);
          });
          setSavedJobIds(idSet);
        }
      } catch {
        // Ignore if offline
      }

      let initialRoles = ["GenAI Engineer", "Backend Developer"];
      let initialLocs = ["Remote"];
      let initialMode = "any";

      if (typeof window !== "undefined") {
        try {
          const storedRolesStr = sessionStorage.getItem("search_roles");
          if (storedRolesStr) {
            const parsed = JSON.parse(storedRolesStr);
            if (Array.isArray(parsed) && parsed.length > 0) initialRoles = parsed;
          }
        } catch {}

        try {
          const storedLocsStr = sessionStorage.getItem("search_locations");
          if (storedLocsStr) {
            const parsed = JSON.parse(storedLocsStr);
            if (Array.isArray(parsed) && parsed.length > 0) initialLocs = parsed;
          }
        } catch {}

        const storedMode = sessionStorage.getItem("search_work_mode");
        if (storedMode) initialMode = storedMode;

        if (isMounted) {
          setSelectedRoles(initialRoles);
          setSelectedLocations(initialLocs);
          setWorkMode(initialMode);
        }

        const cached = State.getLastMatches();
        if (cached && cached.length > 0) {
          if (isMounted) {
            setMatches(cached);
            setSelectedMatch(cached[0]);
            setSelectedIndex(0);
          }
        } else {
          if (isMounted) {
            setIsSearching(true);
            setError(null);
          }
          try {
            const data = await API.searchJobs({
              target_roles: initialRoles,
              locations: initialLocs,
              work_mode: initialMode,
            });
            if (isMounted) {
              const results = data.matches || [];
              setMatches(results);
              if (results.length > 0) {
                setSelectedMatch(results[0]);
                setSelectedIndex(0);
              }
            }
          } catch (err: unknown) {
            if (isMounted) {
              setError(err instanceof Error ? err.message : "Search failed");
            }
          } finally {
            if (isMounted) {
              setIsSearching(false);
            }
          }
        }
      }
    };

    initData();

    return () => {
      isMounted = false;
    };
  }, []);

  const toggleRole = (r: string) => {
    setSelectedRoles((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  };

  const addCustomRole = () => {
    const trimmed = roleInput.trim();
    if (trimmed && !selectedRoles.includes(trimmed)) {
      setSelectedRoles((prev) => [...prev, trimmed]);
      setRoleInput("");
    }
  };

  const toggleLocation = (city: string) => {
    setSelectedLocations((prev) => {
      let next = [...prev];
      if (next.includes(city)) {
        next = next.filter((l) => l !== city);
      } else {
        next.push(city);
      }
      return next.length === 0 ? ["Remote"] : next;
    });
  };

  const selectJob = (idx: number, item: MatchResult) => {
    setSelectedIndex(idx);
    setSelectedMatch(item);
    resetPanes();
  };

  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (showSavedOnly && !savedJobIds.has(m.job.id)) return false;
      if (m.score < minFitScore) return false;

      if (filterJobType !== "All") {
        const jt = (m.job.job_type || "").toLowerCase();
        if (filterJobType === "Full-Time" && !jt.includes("full")) return false;
        if (filterJobType === "Contract" && !jt.includes("contract")) return false;
        if (filterJobType === "Part-Time" && !jt.includes("part")) return false;
        if (filterJobType === "Internship" && !jt.includes("intern")) return false;
      }

      if (filterExpLevel !== "All") {
        const reqExp = typeof m.job.experience_level === "number" ? m.job.experience_level : 0;
        const title = (m.job.title || "").toLowerCase();
        if (filterExpLevel === "Fresher") {
          if (reqExp > 24) return false;
          if (title.includes("senior") || title.includes("lead") || title.includes("principal")) return false;
        }
        if (filterExpLevel === "Mid Level") {
          if (reqExp < 24 || reqExp > 72) return false;
          if (title.includes("intern") || title.includes("junior")) return false;
        }
        if (filterExpLevel === "Senior") {
          if (reqExp < 60 && !title.includes("senior") && !title.includes("lead") && !title.includes("principal")) return false;
        }
      }

      if (filterDate !== "All") {
        if (!m.job.created) return false;
        const created = new Date(m.job.created).getTime();
        const now = new Date().getTime();
        const diffHours = (now - created) / (1000 * 60 * 60);
        if (filterDate === "Past 24 Hours" && diffHours > 24) return false;
        if (filterDate === "Past Week" && diffHours > 24 * 7) return false;
        if (filterDate === "Past Month" && diffHours > 24 * 30) return false;
      }

      if (filterMinSalary > 0) {
        if (!m.job.min_salary || m.job.min_salary < filterMinSalary) return false;
      }

      if (filterCompany.trim() !== "") {
        const company = (m.job.company || "").toLowerCase();
        if (!company.includes(filterCompany.toLowerCase().trim())) return false;
      }

      return true;
    });
  }, [
    matches,
    showSavedOnly,
    savedJobIds,
    minFitScore,
    filterJobType,
    filterExpLevel,
    filterDate,
    filterMinSalary,
    filterCompany,
  ]);

  const resetFilters = () => {
    setFilterJobType("All");
    setFilterExpLevel("All");
    setMinFitScore(40);
    setFilterDate("All");
    setFilterMinSalary(0);
    setFilterCompany("");
    setShowSavedOnly(false);
  };

  const isFilterActive =
    filterJobType !== "All" ||
    filterExpLevel !== "All" ||
    minFitScore > 40 ||
    filterDate !== "All" ||
    filterMinSalary > 0 ||
    filterCompany.trim() !== "" ||
    showSavedOnly;

  const toggleSaveJob = async (job: JobPosting, score: number) => {
    const isAlreadySaved = savedJobIds.has(job.id);
    try {
      if (isAlreadySaved) {
        const apps = await API.getApplications();
        const existing = apps.find((a) => a.job_id === job.id);
        if (existing?.id) {
          await API.deleteApplication(existing.id);
        }
        setSavedJobIds((prev) => {
          const next = new Set(prev);
          next.delete(job.id);
          return next;
        });
      } else {
        await API.trackApplication({
          job_id: job.id,
          job_title: job.title,
          company: job.company,
          location: job.location,
          url: getRealJobUrl(job),
          fit_score: score,
          status: "saved",
          notes: "Bookmarked from Discovery Search",
        });
        setSavedJobIds((prev) => new Set(prev).add(job.id));
      }
    } catch (err: unknown) {
      alert("Could not update bookmark: " + (err instanceof Error ? err.message : "Error"));
    }
  };

  const handleTailor = async () => {
    if (!selectedMatch) return;
    setActiveTab("tailoring");
    if (tailoring) return;

    setIsTailoring(true);
    try {
      const res = await API.tailorJob(selectedMatch.job.id, selectedMatch.job);
      setTailoring(res);
    } catch (err: unknown) {
      alert("Tailoring failed: " + (err instanceof Error ? err.message : "Error"));
    } finally {
      setIsTailoring(false);
    }
  };

  const handlePrep = async () => {
    if (!selectedMatch) return;
    setActiveTab("prep");
    if (prep) return;

    setIsPrepping(true);
    try {
      const res = await API.prepJob(selectedMatch.job.id, selectedMatch.job);
      setPrep(res);
    } catch (err: unknown) {
      alert("Prep failed: " + (err instanceof Error ? err.message : "Error"));
    } finally {
      setIsPrepping(false);
    }
  };

  const handleLearn = async () => {
    if (!selectedMatch) return;
    setActiveTab("learn");
    if (learnPath) return;

    setIsLearning(true);
    try {
      const res = await API.learnJob(
        selectedMatch.job.id,
        selectedMatch.gaps || [],
        selectedMatch.job
      );
      setLearnPath(res.markdown || "No path generated.");
    } catch (err: unknown) {
      alert("Learn path failed: " + (err instanceof Error ? err.message : "Error"));
    } finally {
      setIsLearning(false);
    }
  };

  const handleApply = () => {
    if (!selectedMatch?.job) {
      alert("No position selected.");
      return;
    }
    const realUrl = getRealJobUrl(selectedMatch.job);
    window.open(realUrl, "_blank", "noopener,noreferrer");
  };

  const handleApproveTailoring = async () => {
    if (!selectedMatch || !tailoring) return;
    try {
      await API.trackApplication({
        job_id: selectedMatch.job.id,
        job_title: selectedMatch.job.title,
        company: selectedMatch.job.company,
        location: selectedMatch.job.location,
        url: getRealJobUrl(selectedMatch.job),
        fit_score: selectedMatch.score,
        status: "tailored",
        tailored_summary: tailoring.tailored_resume.full_markdown,
        tailored_bullets: [],
        notes: "Tailored and approved by candidate.",
      });
      setSavedJobIds((prev) => new Set(prev).add(selectedMatch.job.id));
      alert("Application saved to Pipeline with Tailored status!");
    } catch (err: unknown) {
      alert("Save failed: " + (err instanceof Error ? err.message : "Error"));
    }
  };

  const handleAutoApply = async () => {
    if (!selectedMatch || !tailoring) return;
    setIsApplying(true);
    setApplyScreenshot(null);
    try {
      const res = await API.applyJob(selectedMatch.job.id, selectedMatch.job, tailoring.tailored_resume);
      if (res.screenshot_base64) {
        setApplyScreenshot(res.screenshot_base64);
        alert("Auto-Apply step completed. Verify the screenshot below.");
      } else {
        alert("Auto-Apply finished but no screenshot was returned.");
      }
    } catch (err: unknown) {
      alert("Auto-Apply failed: " + (err instanceof Error ? err.message : "Error"));
    } finally {
      setIsApplying(false);
    }
  };

  const copyCoverLetter = () => {
    if (!tailoring?.cover_letter.content) return;
    navigator.clipboard.writeText(tailoring.cover_letter.content);
    setCopiedCoverLetter(true);
    setTimeout(() => setCopiedCoverLetter(false), 2000);
  };

  const downloadPrepMarkdown = () => {
    if (!prep?.markdown) return;
    const blob = new Blob([prep.markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview_prep_${(selectedMatch?.job.company || "company")
      .toLowerCase()
      .replace(/\s+/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const detailTabs = [
    { id: "details", label: "Overview", icon: Layers },
    { id: "tailoring", label: "AI Tailoring", icon: FileEdit },
    { id: "prep", label: "Interview Prep", icon: Brain },
    { id: "learn", label: "Skill Path", icon: GraduationCap },
  ] as const;

  return (
    <main className="w-full flex-1 flex flex-col bg-slate-50 min-h-screen relative overflow-x-clip">
      {/* Ambient aurora */}
      <div className="absolute inset-x-0 top-0 -z-10 h-[420px] overflow-hidden pointer-events-none">
        <div className="animate-blob absolute -top-32 left-1/4 w-[420px] h-[320px] rounded-full bg-violet-200/40 blur-3xl" />
        <div className="animate-blob-delayed absolute -top-24 right-1/4 w-[380px] h-[300px] rounded-full bg-indigo-200/40 blur-3xl" />
      </div>

      {/* TOP SEARCH & WORKSPACE CONTROL BAR */}
      <section className="sticky top-[76px] z-40 px-3 sm:px-6 pt-3">
        <div className="max-w-7xl mx-auto rounded-2xl bg-white/75 backdrop-blur-xl border border-violet-100 shadow-[0_8px_30px_-12px_rgba(124,58,237,0.18)] p-3 space-y-3">
          {/* Main Search Inputs */}
          <div className="flex flex-col lg:flex-row items-stretch gap-2.5">
            {/* Target Roles Pill Input */}
            <div className="flex-1 bg-violet-50/50 border border-violet-200/70 rounded-xl px-3 py-2 flex flex-wrap items-center gap-1.5 focus-within:bg-white focus-within:border-violet-400 transition-colors">
              <Search className="w-4 h-4 text-violet-400 shrink-0" />
              <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-[200px]">
                {selectedRoles.map((r) => (
                  <span
                    key={r}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-gradient text-white text-xs font-semibold shadow-sm shadow-violet-500/20"
                  >
                    <span>{r}</span>
                    <button
                      type="button"
                      onClick={() => toggleRole(r)}
                      className="hover:text-violet-200 font-bold ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder={selectedRoles.length === 0 ? "Add role or title..." : "+ Add role..."}
                  className="bg-transparent text-xs font-medium text-slate-900 focus:outline-none min-w-[100px] flex-1"
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomRole();
                    }
                  }}
                />
              </div>
            </div>

            {/* Location Selector */}
            <div className="flex-1 max-w-xs bg-violet-50/50 border border-violet-200/70 rounded-xl px-3 py-2 flex items-center gap-2 focus-within:bg-white focus-within:border-violet-400 transition-colors">
              <MapPin className="w-4 h-4 text-violet-400 shrink-0" />
              <div className="flex-1 flex flex-wrap gap-1 items-center">
                {selectedLocations.map((loc) => (
                  <span
                    key={loc}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-medium"
                  >
                    <span>{loc}</span>
                    {selectedLocations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => toggleLocation(loc)}
                        className="hover:text-indigo-950"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {/* Work Mode Selector */}
            <div className="w-full lg:w-40 bg-violet-50/50 border border-violet-200/70 rounded-xl px-3 py-2 flex items-center gap-2 focus-within:bg-white focus-within:border-violet-400 transition-colors">
              <Briefcase className="w-4 h-4 text-violet-400 shrink-0" />
              <select
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer w-full"
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value)}
              >
                <option value="any">Any Work Mode</option>
                <option value="remote">Remote Only</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-site</option>
              </select>
            </div>

            {/* Match Action Button */}
            <button
              disabled={isSearching}
              onClick={() => handleSearch()}
              className="relative overflow-hidden px-6 py-2.5 bg-brand-gradient text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60"
            >
              {isSearching && <span className="animate-shimmer absolute inset-0" />}
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <SlidersHorizontal className="w-4 h-4" />
              )}
              <span>{isSearching ? "Matching..." : "Find Matches"}</span>
            </button>
          </div>

          {/* Quick Selection Pills Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-500 font-medium mr-1">Quick Roles:</span>
              {POPULAR_ROLES.slice(0, 5).map((r) => {
                const isSelected = selectedRoles.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleRole(r)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-brand-gradient text-white font-semibold shadow-sm shadow-violet-500/25"
                        : "bg-white border border-violet-100 hover:border-violet-300 text-slate-700 hover:-translate-y-0.5"
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium mr-1">Locations:</span>
              {POPULAR_LOCATIONS.map((loc) => {
                const isSelected = selectedLocations.includes(loc);
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => toggleLocation(loc)}
                    className={`px-2.5 py-1 rounded-full text-xs transition-all ${
                      isSelected
                        ? "bg-slate-900 text-white font-semibold"
                        : "bg-white border border-slate-200 hover:border-slate-400 text-slate-700"
                    }`}
                  >
                    {loc}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* FILTER RIBBON & STATS */}
      <section className="px-3 sm:px-6 pt-3">
        <div className="max-w-7xl mx-auto rounded-2xl bg-white/60 backdrop-blur border border-violet-100/80 py-2.5 px-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left: Filter Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 text-slate-800 font-semibold mr-1">
              <Filter className="w-3.5 h-3.5 text-violet-600" />
              <span>Filters:</span>
            </div>

            <select
              className="bg-white border border-violet-200/70 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:border-violet-500"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            >
              <option value="All">All Dates</option>
              <option value="Past 24 Hours">Past 24 Hours</option>
              <option value="Past Week">Past Week</option>
              <option value="Past Month">Past Month</option>
            </select>

            <select
              className="bg-white border border-violet-200/70 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:border-violet-500"
              value={filterJobType}
              onChange={(e) => setFilterJobType(e.target.value)}
            >
              <option value="All">All Job Types</option>
              <option value="Full-Time">Full-Time</option>
              <option value="Contract">Contract</option>
              <option value="Part-Time">Part-Time</option>
              <option value="Internship">Internship</option>
            </select>

            <select
              className="bg-white border border-violet-200/70 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:border-violet-500"
              value={filterExpLevel}
              onChange={(e) => setFilterExpLevel(e.target.value)}
            >
              <option value="All">All Experience</option>
              <option value="Fresher">Entry / Fresher</option>
              <option value="Mid Level">Mid Level</option>
              <option value="Senior">Senior / Lead</option>
            </select>

            <input
              type="text"
              placeholder="Filter company..."
              className="bg-white border border-violet-200/70 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:border-violet-500 w-28 sm:w-32"
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
            />

            <div className="flex items-center gap-1.5 bg-white border border-violet-200/70 rounded-lg px-2.5 py-1">
              <span className="text-slate-500 font-medium">Fit ≥ {minFitScore}%</span>
              <input
                type="range"
                min="0"
                max="90"
                step="5"
                value={minFitScore}
                onChange={(e) => setMinFitScore(parseInt(e.target.value))}
                className="w-16 accent-violet-600 cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowSavedOnly(!showSavedOnly)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full font-semibold transition-all ${
                showSavedOnly
                  ? "bg-brand-gradient text-white shadow-sm shadow-violet-500/25"
                  : "bg-white border border-violet-200/70 text-slate-700 hover:border-violet-400"
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Saved ({savedJobIds.size})</span>
            </button>

            {isFilterActive && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 rounded-full hover:bg-rose-50 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Right: Count Badge */}
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <span>
              Showing <strong className="text-slate-900 font-bold">{filteredMatches.length}</strong> roles
            </span>
            {filteredMatches.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white text-[11px] font-bold shadow-sm">
                Top: {filteredMatches[0].score}% Fit
              </span>
            )}
          </div>
        </div>
      </section>

      {/* MASTER-DETAIL 2-PANE WORKSPACE */}
      <section className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* COLUMN 1: Job Results Feed */}
          <div className="lg:col-span-5">
            <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto custom-scroll pr-1 pb-16">
              {isSearching ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      className="bg-white/80 border border-violet-100 rounded-2xl p-4 space-y-3 animate-pulse"
                      style={{ animationDelay: `${n * 120}ms` }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex gap-3 flex-1">
                          <div className="w-10 h-10 rounded-xl bg-violet-100"></div>
                          <div className="space-y-2 flex-1">
                            <div className="h-3 bg-violet-100 rounded w-1/3"></div>
                            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                          </div>
                        </div>
                        <div className="w-11 h-11 rounded-full bg-violet-100"></div>
                      </div>
                      <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 space-y-2">
                  <h4 className="font-bold font-heading">Search Error</h4>
                  <p className="text-sm font-normal">{error}</p>
                  <button
                    onClick={() => handleSearch()}
                    className="px-4 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 transition-colors"
                  >
                    Retry Search
                  </button>
                </div>
              ) : filteredMatches.length === 0 ? (
                <div className="card-glow rounded-2xl p-8 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto text-violet-400">
                    <Search className="w-7 h-7" />
                  </div>
                  <h3 className="font-heading font-bold text-slate-900 text-base">No jobs matched</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Try lowering your Min Fit Score slider or clearing filters to see more opportunities.
                  </p>
                  {isFilterActive && (
                    <button
                      onClick={resetFilters}
                      className="px-4 py-1.5 bg-brand-gradient text-white text-xs font-semibold rounded-full hover:shadow-lg hover:shadow-violet-500/25 transition-shadow"
                    >
                      Clear Active Filters
                    </button>
                  )}
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {filteredMatches.map((m, idx) => {
                    const isSelected = selectedIndex === idx;
                    const isSaved = savedJobIds.has(m.job.id);

                    return (
                      <motion.article
                        layout
                        key={m.job.id || idx}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ delay: Math.min(idx * 0.04, 0.3), duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        onClick={() => selectJob(idx, m)}
                        whileHover={{ y: -2 }}
                        className={`rounded-2xl p-4 cursor-pointer transition-shadow ${
                          isSelected
                            ? "bg-white border-2 border-violet-500 shadow-xl shadow-violet-500/15"
                            : "card-glow"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            {/* Company Avatar Monogram */}
                            <div
                              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradientForCompany(
                                m.job.company || "C"
                              )} text-white flex items-center justify-center font-heading font-bold text-base shrink-0 shadow-md`}
                            >
                              {(m.job.company || "C").charAt(0).toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-violet-600 truncate block">
                                {m.job.company || "Company"}
                              </span>
                              <h3 className="font-heading text-sm font-bold text-slate-900 truncate leading-snug mt-0.5">
                                {m.job.title}
                              </h3>
                              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                <span>{m.job.location || "Remote"}</span>
                                <span>·</span>
                                <span>{m.job.is_remote ? "Remote" : "On-site"}</span>
                              </div>
                            </div>
                          </div>

                          {/* Fit Score Ring & Quick Bookmark */}
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <ScoreRing score={m.score} size={44} stroke={4} />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSaveJob(m.job, m.score);
                              }}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isSaved
                                  ? "text-violet-600 bg-violet-50"
                                  : "text-slate-300 hover:text-violet-600 hover:bg-violet-50"
                              }`}
                              title={isSaved ? "Saved in Tracker" : "Save Job"}
                            >
                              {isSaved ? (
                                <BookmarkCheck className="w-4 h-4 fill-violet-600 text-violet-600" />
                              ) : (
                                <Bookmark className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Card Tags / Salary Row */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-violet-100/70">
                          {m.job.salary && (
                            <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-800 text-[11px] font-bold border border-violet-100">
                              {m.job.salary}
                            </span>
                          )}
                          {m.job.job_type && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200/70">
                              {m.job.job_type}
                            </span>
                          )}
                          {m.gaps && m.gaps.length > 0 && (
                            <span className="text-[10px] text-amber-700 font-semibold ml-auto">
                              {m.gaps.length} skill gap{m.gaps.length > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </motion.article>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* COLUMN 2: Sticky Detail Pane & Agent Tools */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl border border-violet-100 shadow-xl shadow-violet-500/10 sticky top-[76px] overflow-hidden">
              {selectedMatch ? (
                <>
                  {/* Gradient Selected Job Header */}
                  <div className="relative bg-brand-gradient animate-gradient-x p-6 pb-5 overflow-hidden">
                    <div className="animate-blob absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/15 blur-2xl" />
                    <div className="relative flex items-start justify-between gap-4 text-white">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center font-heading font-bold text-sm border border-white/25">
                            {(selectedMatch.job.company || "C").charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-white/95 truncate">
                            {selectedMatch.job.company || "Company"}
                          </span>
                        </div>
                        <h2 className="font-heading text-xl sm:text-2xl font-extrabold leading-tight">
                          {selectedMatch.job.title}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2.5 text-xs text-violet-100 pt-0.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {selectedMatch.job.location || "Remote"}
                          </span>
                          <span>·</span>
                          <span>{selectedMatch.job.is_remote ? "Remote" : "On-site"}</span>
                          {selectedMatch.job.salary && (
                            <>
                              <span>·</span>
                              <strong className="text-white font-semibold">
                                {selectedMatch.job.salary}
                              </strong>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Big Fit Score Ring */}
                      <div className="flex flex-col items-center shrink-0">
                        <div className="relative">
                          <ScoreRing score={selectedMatch.score} size={76} stroke={6} />
                        </div>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-violet-100 mt-1">
                          Profile Fit
                        </span>
                      </div>
                    </div>

                    {/* Primary Action Button Strip */}
                    <div className="relative flex flex-wrap items-center gap-2.5 pt-4">
                      <button
                        type="button"
                        onClick={handleApply}
                        className="flex-1 min-w-[140px] px-5 py-2.5 bg-white text-violet-700 hover:shadow-xl hover:-translate-y-0.5 transition-all rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg"
                      >
                        <span>Apply on Company Site</span>
                        <ExternalLink className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleSaveJob(selectedMatch.job, selectedMatch.score)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 border backdrop-blur transition-all ${
                          savedJobIds.has(selectedMatch.job.id)
                            ? "bg-white/25 border-white/40 text-white"
                            : "bg-white/10 border-white/25 text-white hover:bg-white/20"
                        }`}
                      >
                        {savedJobIds.has(selectedMatch.job.id) ? (
                          <>
                            <BookmarkCheck className="w-4 h-4" />
                            <span>Saved</span>
                          </>
                        ) : (
                          <>
                            <Bookmark className="w-4 h-4" />
                            <span>Save Job</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Contextual Workspace Tabs */}
                  <div className="flex border-b border-violet-100 gap-1 px-4 pt-2 bg-white/80 backdrop-blur overflow-x-auto custom-scroll">
                    {detailTabs.map((tab) => {
                      const isActive = activeTab === tab.id;
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            if (tab.id === "tailoring") handleTailor();
                            else if (tab.id === "prep") handlePrep();
                            else if (tab.id === "learn") handleLearn();
                            else setActiveTab("details");
                          }}
                          className={`relative flex items-center gap-1.5 px-3.5 pb-2.5 pt-1.5 text-xs sm:text-sm font-semibold transition-colors rounded-t-lg ${
                            isActive ? "text-violet-700" : "text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          {isActive && (
                            <motion.span
                              layoutId="detail-tab"
                              className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand-gradient"
                              transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                            />
                          )}
                          <Icon className="w-4 h-4" />
                          <span className="whitespace-nowrap">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* TAB CONTENT */}
                  <div className="p-5">
                    {/* TAB 1: OVERVIEW & MATCH INSIGHTS */}
                    {activeTab === "details" && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4 max-h-[520px] overflow-y-auto custom-scroll pr-1"
                      >
                        <div className="p-4 rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 space-y-1.5">
                          <span className="text-xs font-bold text-violet-800 flex items-center gap-1.5 uppercase tracking-wide">
                            <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                            Semantic Match Rationale
                          </span>
                          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                            {selectedMatch.reasons ||
                              "Direct alignment based on your core skills and experience summary."}
                          </p>
                        </div>

                        <div className="p-4 rounded-xl bg-white border border-violet-100 space-y-2">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            Skill Alignment & Gaps
                          </span>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {selectedMatch.gaps && selectedMatch.gaps.length > 0 ? (
                              selectedMatch.gaps.map((gap, i) => (
                                <span
                                  key={i}
                                  className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium"
                                >
                                  {gap}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                No critical skill gaps identified. Strong match!
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-heading font-bold text-slate-900 text-sm">
                            Job Description
                          </h4>
                          <div className="p-4 rounded-xl bg-slate-50 border border-violet-100/60 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                            {selectedMatch.job.description || "No description provided for this position."}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* TAB 2: RESUME TAILORING */}
                    {activeTab === "tailoring" && (
                      <div className="space-y-4 max-h-[520px] overflow-y-auto custom-scroll pr-1">
                        {isTailoring ? (
                          <AgentLoader
                            title="Synthesizing Tailored Resume..."
                            subtitle="Checking every bullet point against your source resume through the zero-fabrication critic."
                          />
                        ) : tailoring ? (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                          >
                            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>
                                Zero-Fabrication Critic: Passed. All statements are grounded in your real profile.
                              </span>
                            </div>

                            <div className="space-y-1.5" ref={resumeRef}>
                              <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                                Full Tailored Resume
                              </span>
                              <div className="p-5 rounded-xl bg-white border border-violet-100 text-xs sm:text-sm text-slate-800 leading-relaxed shadow-sm">
                                <div className="prose prose-sm max-w-none prose-headings:font-bold prose-a:text-violet-600 prose-headings:text-slate-900">
                                  <ReactMarkdown>
                                    {tailoring.tailored_resume.full_markdown || "No resume content generated."}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                                  Tailored Cover Letter
                                </span>
                                <button
                                  type="button"
                                  onClick={copyCoverLetter}
                                  className="text-xs text-violet-700 hover:text-violet-900 font-semibold flex items-center gap-1"
                                >
                                  {copiedCoverLetter ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>Copy Text</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <textarea
                                readOnly
                                value={tailoring.cover_letter.content}
                                rows={5}
                                className="w-full p-3.5 rounded-xl bg-violet-50/40 border border-violet-100 text-xs sm:text-sm text-slate-800 focus:outline-none resize-none font-normal"
                              />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 w-full">
                              <button
                                type="button"
                                onClick={handleApproveTailoring}
                                className="flex-1 py-3 bg-brand-gradient text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5 transition-all"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Approve & Save</span>
                              </button>
                              <button
                                type="button"
                                onClick={downloadResumePdf}
                                className="flex-1 py-3 bg-white border border-violet-200 hover:border-violet-400 text-slate-700 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                              >
                                <Download className="w-4 h-4" />
                                <span>Download PDF</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleAutoApply}
                                disabled={isApplying}
                                className="flex-1 py-3 bg-slate-900 hover:bg-black disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                              >
                                {isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                <span>{isApplying ? "Applying..." : "Auto-Apply"}</span>
                              </button>
                            </div>

                            {applyScreenshot && (
                              <div className="w-full mt-4 border border-violet-100 rounded-xl overflow-hidden bg-white shadow-sm">
                                <div className="px-4 py-3 border-b border-violet-100 bg-violet-50/50">
                                  <h4 className="text-sm font-bold text-slate-800">Auto-Apply Submission Screenshot</h4>
                                </div>
                                <div className="p-4 flex justify-center bg-slate-50">
                                  <img
                                    src={`data:image/png;base64,${applyScreenshot}`}
                                    alt="Submission proof"
                                    className="max-w-full rounded shadow-sm border border-slate-200"
                                  />
                                </div>
                              </div>
                            )}
                          </motion.div>
                        ) : (
                          <div className="p-8 text-center space-y-3 bg-violet-50/40 rounded-2xl border border-dashed border-violet-300">
                            <div className="w-12 h-12 rounded-2xl bg-brand-gradient flex items-center justify-center text-white mx-auto shadow-lg shadow-violet-500/25">
                              <FileEdit className="w-6 h-6" />
                            </div>
                            <h4 className="font-heading font-bold text-slate-900 text-sm">
                              Generate Tailored Resume
                            </h4>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                              Rewrite summary and bullets specifically for this job description without fabricating claims.
                            </p>
                            <button
                              type="button"
                              onClick={handleTailor}
                              className="px-5 py-2 bg-brand-gradient text-white text-xs font-bold rounded-full shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5 transition-all"
                            >
                              Generate Tailored Draft
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 3: INTERVIEW PREP GUIDE */}
                    {activeTab === "prep" && (
                      <div className="space-y-4 max-h-[520px] overflow-y-auto custom-scroll pr-1">
                        {isPrepping ? (
                          <AgentLoader
                            title="Synthesizing Interview Guide..."
                            subtitle="Researching company talking points and formulating role-specific questions."
                            accent="indigo"
                          />
                        ) : prep ? (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                          >
                            <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-1.5">
                              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                                Company Overview
                              </span>
                              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                                {prep.interview_prep.company_overview}
                              </p>
                            </div>

                            <div className="space-y-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                Your Key Talking Points
                              </span>
                              <ul className="space-y-1.5 text-xs sm:text-sm text-slate-800">
                                {prep.interview_prep.key_talking_points.map((tp, i) => (
                                  <li
                                    key={i}
                                    className="flex items-start gap-2 p-2.5 rounded-xl bg-white border border-indigo-100"
                                  >
                                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                      {i + 1}
                                    </span>
                                    <span>{tp}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="space-y-2.5">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                Anticipated Interview Questions
                              </span>
                              <div className="space-y-2.5">
                                {prep.interview_prep.likely_questions.map((q, i) => (
                                  <div
                                    key={i}
                                    className="p-3.5 rounded-xl bg-white border border-violet-100 space-y-2 hover:border-violet-300 transition-colors"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                        {i + 1}. {q.question}
                                      </span>
                                      <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100 text-[10px] font-bold uppercase shrink-0">
                                        {q.category}
                                      </span>
                                    </div>
                                    <div className="text-xs text-slate-600 bg-violet-50/40 p-2.5 rounded-lg border border-violet-100/60 italic">
                                      &ldquo;{q.suggested_answer}&rdquo;
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={downloadPrepMarkdown}
                              className="w-full py-2.5 bg-white border border-violet-200 hover:border-violet-400 hover:bg-violet-50/40 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
                            >
                              <Download className="w-4 h-4" />
                              <span>Download Interview Sheet (.md)</span>
                            </button>
                          </motion.div>
                        ) : (
                          <div className="p-8 text-center space-y-3 bg-indigo-50/40 rounded-2xl border border-dashed border-indigo-300">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-500/25">
                              <Brain className="w-6 h-6" />
                            </div>
                            <h4 className="font-heading font-bold text-slate-900 text-sm">
                              Synthesize Interview Guide
                            </h4>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                              Generate tailored questions, suggested answers, and company talking points.
                            </p>
                            <button
                              type="button"
                              onClick={handlePrep}
                              className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-bold rounded-full shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all"
                            >
                              Generate Guide
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 4: SKILL BRIDGE LEARNING PATH */}
                    {activeTab === "learn" && (
                      <div className="space-y-4 max-h-[520px] overflow-y-auto custom-scroll pr-1">
                        {isLearning ? (
                          <AgentLoader
                            title="Building Skill Curriculum..."
                            subtitle="Formulating tailored study steps for your identified skill gaps."
                            accent="amber"
                          />
                        ) : learnPath ? (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/70 text-xs sm:text-sm text-slate-800 leading-relaxed space-y-3"
                          >
                            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                              <GraduationCap className="w-4 h-4 text-amber-600" />
                              Targeted Curriculum
                            </span>
                            <div className="whitespace-pre-line font-normal">{learnPath}</div>
                          </motion.div>
                        ) : (
                          <div className="p-8 text-center space-y-3 bg-amber-50/40 rounded-2xl border border-dashed border-amber-300">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center text-white mx-auto shadow-lg shadow-amber-500/25">
                              <GraduationCap className="w-6 h-6" />
                            </div>
                            <h4 className="font-heading font-bold text-slate-900 text-sm">
                              Create Skill Bridge Path
                            </h4>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                              Generate a step-by-step study curriculum to bridge identified requirements for this role.
                            </p>
                            <button
                              type="button"
                              onClick={handleLearn}
                              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-rose-500 text-white text-xs font-bold rounded-full shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:-translate-y-0.5 transition-all"
                            >
                              Create Path
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* No Job Selected Empty State */
                <div className="p-12 text-center space-y-4 flex flex-col items-center justify-center min-h-[450px]">
                  <div className="animate-float w-16 h-16 rounded-2xl bg-brand-gradient flex items-center justify-center text-white shadow-xl shadow-violet-500/25">
                    <Briefcase className="w-8 h-8" />
                  </div>
                  <h3 className="font-heading font-bold text-slate-900 text-lg">
                    Select a Role to Inspect
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-xs leading-relaxed">
                    Choose an opportunity from the feed to see semantic reasoning, AI resume tailoring, and
                    customized interview guides.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
