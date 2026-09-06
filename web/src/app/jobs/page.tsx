"use client";

import { useReactToPrint } from "react-to-print";
import ReactMarkdown from "react-markdown";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { API, State, getRealJobUrl } from "@/lib/api";
import {
  JobPosting,
  MatchResult,
  TailorResponse,
  PrepResponse,
  Application,
} from "@/lib/types";
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
  ChevronRight,
  ChevronDown,
  Send,
  Check,
  Brain,
  Layers,
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

  // Saved applications from backend to sync bookmark states
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());

  // Filters
  const [filterJobType, setFilterJobType] = useState<string>("All");
  const [filterExpLevel, setFilterExpLevel] = useState<string>("All");
  const [minFitScore, setMinFitScore] = useState<number>(0);
  const [filterDate, setFilterDate] = useState<string>("All");
  const [filterMinSalary, setFilterMinSalary] = useState<number>(0);
  const [filterCompany, setFilterCompany] = useState<string>("");
  const [showSavedOnly, setShowSavedOnly] = useState<boolean>(false);

  // Interactive Pane Tabs & States
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

  // Initial mount: load session storage and cached matches
  useEffect(() => {
    let isMounted = true;

    const initData = async () => {
      // 1. Fetch saved job IDs once
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

      // 2. Parse session storage
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
          // Perform search once on initial empty cache
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

  // Filtered dataset
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

  // Actions
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

  return (
    <main className="w-full flex-1 flex flex-col bg-slate-50 min-h-screen">
      
      {/* TOP SEARCH & WORKSPACE CONTROL BAR */}
      <section className="bg-white border-b border-slate-200 sticky top-16 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 space-y-3">
          
          {/* Main Search Inputs */}
          <div className="flex flex-col lg:flex-row items-stretch gap-2.5">
            {/* Target Roles Pill Input */}
            <div className="flex-1 bg-slate-50 border border-slate-300/80 rounded-xl px-3 py-2 flex flex-wrap items-center gap-1.5 focus-within:bg-white focus-within:border-blue-600 transition-colors">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-[200px]">
                {selectedRoles.map((r) => (
                  <span
                    key={r}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold"
                  >
                    <span>{r}</span>
                    <button
                      type="button"
                      onClick={() => toggleRole(r)}
                      className="hover:text-blue-950 font-bold ml-0.5"
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
            <div className="flex-1 max-w-xs bg-slate-50 border border-slate-300/80 rounded-xl px-3 py-2 flex items-center gap-2 focus-within:bg-white focus-within:border-blue-600 transition-colors">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="flex-1 flex flex-wrap gap-1 items-center">
                {selectedLocations.map((loc) => (
                  <span
                    key={loc}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-xs font-medium"
                  >
                    <span>{loc}</span>
                    {selectedLocations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => toggleLocation(loc)}
                        className="hover:text-black"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {/* Work Mode Selector */}
            <div className="w-full lg:w-40 bg-slate-50 border border-slate-300/80 rounded-xl px-3 py-2 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
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
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-60"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <SlidersHorizontal className="w-4 h-4" />
              )}
              <span>Find Matches</span>
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
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-blue-600 text-white font-semibold"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
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
                    className={`px-2 py-0.5 rounded text-xs transition-colors ${
                      isSelected
                        ? "bg-slate-900 text-white font-semibold"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
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
      <section className="bg-slate-100/80 border-b border-slate-200 py-2.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Left: Filter Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 text-slate-800 font-semibold mr-1">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span>Filters:</span>
            </div>

            {/* Date Posted */}
            <select
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 focus:outline-none"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            >
              <option value="All">All Dates</option>
              <option value="Past 24 Hours">Past 24 Hours</option>
              <option value="Past Week">Past Week</option>
              <option value="Past Month">Past Month</option>
            </select>

            {/* Job Type */}
            <select
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 focus:outline-none"
              value={filterJobType}
              onChange={(e) => setFilterJobType(e.target.value)}
            >
              <option value="All">All Job Types</option>
              <option value="Full-Time">Full-Time</option>
              <option value="Contract">Contract</option>
              <option value="Part-Time">Part-Time</option>
              <option value="Internship">Internship</option>
            </select>

            {/* Experience Level */}
            <select
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 focus:outline-none"
              value={filterExpLevel}
              onChange={(e) => setFilterExpLevel(e.target.value)}
            >
              <option value="All">All Experience</option>
              <option value="Fresher">Entry / Fresher</option>
              <option value="Mid Level">Mid Level</option>
              <option value="Senior">Senior / Lead</option>
            </select>

            {/* Company Search */}
            <input
              type="text"
              placeholder="Filter company..."
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 focus:outline-none w-28 sm:w-32"
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
            />

            {/* Min Fit Slider */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1">
              <span className="text-slate-500 font-medium">Fit ≥ {minFitScore}%</span>
              <input
                type="range"
                min="0"
                max="90"
                step="5"
                value={minFitScore}
                onChange={(e) => setMinFitScore(parseInt(e.target.value))}
                className="w-16 accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Saved Jobs Toggle Pill */}
            <button
              type="button"
              onClick={() => setShowSavedOnly(!showSavedOnly)}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg font-semibold transition-colors ${
                showSavedOnly
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Saved ({savedJobIds.size})</span>
            </button>

            {/* Reset Filters */}
            {isFilterActive && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 rounded hover:bg-rose-50 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Right: Count Badge */}
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <span>Showing <strong className="text-slate-900 font-bold">{filteredMatches.length}</strong> roles</span>
            {filteredMatches.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                Top: {filteredMatches[0].score}% Fit
              </span>
            )}
          </div>
        </div>
      </section>

      {/* MASTER-DETAIL 2-PANE WORKSPACE */}
      <section className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* COLUMN 1: Job Results Feed (Left Column, 5 Cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="space-y-3 max-h-[calc(100vh-230px)] overflow-y-auto custom-scroll pr-1 pb-16">
              {isSearching ? (
                /* Skeleton Loader */
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 animate-pulse">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                          <div className="h-5 bg-slate-200 rounded w-3/4"></div>
                        </div>
                        <div className="h-6 bg-slate-200 rounded-full w-16"></div>
                      </div>
                      <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                      <div className="flex gap-2 pt-2">
                        <div className="h-5 bg-slate-200 rounded w-14"></div>
                        <div className="h-5 bg-slate-200 rounded w-16"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-2">
                  <h4 className="font-bold">Search Error</h4>
                  <p className="text-sm font-normal">{error}</p>
                  <button
                    onClick={() => handleSearch()}
                    className="px-3 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700"
                  >
                    Retry Search
                  </button>
                </div>
              ) : filteredMatches.length === 0 ? (
                <div className="card-subtle rounded-xl p-8 text-center space-y-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className="font-heading font-bold text-slate-900 text-base">No jobs matched</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Try lowering your Min Fit Score slider or clearing filters to see more available opportunities.
                  </p>
                  {isFilterActive && (
                    <button
                      onClick={resetFilters}
                      className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-black transition-colors"
                    >
                      Clear Active Filters
                    </button>
                  )}
                </div>
              ) : (
                /* High-Density Scannable Job Cards */
                filteredMatches.map((m, idx) => {
                  const isSelected = selectedIndex === idx;
                  const isSaved = savedJobIds.has(m.job.id);

                  let scoreBadgeStyle = "bg-slate-100 text-slate-700 border-slate-200";
                  if (m.score >= 80) {
                    scoreBadgeStyle = "bg-emerald-50 text-emerald-800 border-emerald-200";
                  } else if (m.score >= 60) {
                    scoreBadgeStyle = "bg-amber-50 text-amber-800 border-amber-200";
                  }

                  return (
                    <article
                      key={m.job.id || idx}
                      onClick={() => selectJob(idx, m)}
                      className={`rounded-xl p-4 cursor-pointer transition-all ${
                        isSelected
                          ? "card-subtle-selected"
                          : "card-subtle hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          {/* Company Avatar Monogram */}
                          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center font-heading font-bold text-base shrink-0">
                            {(m.job.company || "C").charAt(0).toUpperCase()}
                          </div>

                          {/* Titles and Metadata */}
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-slate-600 truncate block">
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

                        {/* Fit Score Badge & Quick Bookmark */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${scoreBadgeStyle}`}
                          >
                            {m.score}% Fit
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSaveJob(m.job, m.score);
                            }}
                            className={`p-1.5 rounded-md transition-colors ${
                              isSaved
                                ? "text-blue-600 bg-blue-50"
                                : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            }`}
                            title={isSaved ? "Saved in Tracker" : "Save Job"}
                          >
                            {isSaved ? (
                              <BookmarkCheck className="w-4 h-4 fill-blue-600" />
                            ) : (
                              <Bookmark className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Card Tags / Salary Row */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100">
                        {m.job.salary && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px] font-bold border border-slate-200">
                            {m.job.salary}
                          </span>
                        )}
                        {m.job.job_type && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200/80">
                            {m.job.job_type}
                          </span>
                        )}
                        {m.gaps && m.gaps.length > 0 && (
                          <span className="text-[10px] text-amber-700 font-medium">
                            {m.gaps.length} skill gap{m.gaps.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>

          {/* COLUMN 2: Sticky Detail Pane & Agent Tools (Right Column, 7 Cols) */}
          <div className="lg:col-span-7">
            <div className="card-subtle rounded-2xl p-6 sticky top-36 space-y-6">
              {selectedMatch ? (
                <>
                  {/* Selected Job Header */}
                  <div className="space-y-4 border-b border-slate-200 pb-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-500" />
                          <span className="text-sm font-semibold text-slate-700">
                            {selectedMatch.job.company || "Company"}
                          </span>
                        </div>
                        <h2 className="font-heading text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
                          {selectedMatch.job.title}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 pt-0.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {selectedMatch.job.location || "Remote"}
                          </span>
                          <span>·</span>
                          <span>{selectedMatch.job.is_remote ? "Remote" : "On-site"}</span>
                          {selectedMatch.job.salary && (
                            <>
                              <span>·</span>
                              <strong className="text-slate-800 font-semibold">
                                {selectedMatch.job.salary}
                              </strong>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Big Fit Score Callout */}
                      <div className="text-right flex flex-col items-end shrink-0">
                        <div
                          className={`font-heading text-3xl font-black ${
                            selectedMatch.score >= 80
                              ? "text-emerald-600"
                              : selectedMatch.score >= 60
                              ? "text-amber-600"
                              : "text-slate-700"
                          }`}
                        >
                          {selectedMatch.score}%
                        </div>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                          Profile Fit
                        </span>
                      </div>
                    </div>

                    {/* Primary Action Button Strip */}
                    <div className="flex flex-wrap items-center gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={handleApply}
                        className="flex-1 min-w-[140px] px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                      >
                        <span>Apply on Company Site</span>
                        <ExternalLink className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleSaveJob(selectedMatch.job, selectedMatch.score)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 border transition-colors ${
                          savedJobIds.has(selectedMatch.job.id)
                            ? "bg-blue-50 border-blue-200 text-blue-700"
                            : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {savedJobIds.has(selectedMatch.job.id) ? (
                          <>
                            <BookmarkCheck className="w-4 h-4 fill-blue-600 text-blue-600" />
                            <span>Saved in Tracker</span>
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
                  <div className="flex border-b border-slate-200 gap-6 text-xs sm:text-sm">
                    {[
                      { id: "details", label: "Overview & Match", icon: Layers },
                      { id: "tailoring", label: "AI Resume Tailoring", icon: FileEdit },
                      { id: "prep", label: "Interview Prep Guide", icon: Brain },
                      { id: "learn", label: "Skill Bridge Path", icon: GraduationCap },
                    ].map((tab) => {
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
                          className={`flex items-center gap-1.5 pb-3 font-semibold transition-colors border-b-2 ${
                            isActive
                              ? "text-blue-600 border-blue-600"
                              : "text-slate-500 border-transparent hover:text-slate-900"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* TAB 1: OVERVIEW & MATCH INSIGHTS */}
                  {activeTab === "details" && (
                    <div className="space-y-5 max-h-[480px] overflow-y-auto custom-scroll pr-1">
                      {/* Semantic Match Rationale */}
                      <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 space-y-1.5">
                        <span className="text-xs font-bold text-blue-800 flex items-center gap-1.5 uppercase tracking-wide">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                          Semantic Match Rationale
                        </span>
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                          {selectedMatch.reasons || "Direct alignment based on your core skills and experience summary."}
                        </p>
                      </div>

                      {/* Skill Gaps Analysis */}
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          Skill Alignment & Gaps
                        </span>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {selectedMatch.gaps && selectedMatch.gaps.length > 0 ? (
                            selectedMatch.gaps.map((gap, i) => (
                              <span
                                key={i}
                                className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium"
                              >
                                {gap}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              No critical skill gaps identified. Strong match!
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Full Formatted Description */}
                      <div className="space-y-2">
                        <h4 className="font-heading font-bold text-slate-900 text-sm">
                          Job Description
                        </h4>
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                          {selectedMatch.job.description || "No description provided for this position."}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: RESUME TAILORING */}
                  {activeTab === "tailoring" && (
                    <div className="space-y-5 max-h-[480px] overflow-y-auto custom-scroll pr-1">
                      {isTailoring ? (
                        <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                          <h4 className="font-heading font-bold text-slate-900 text-base">
                            Synthesizing Tailored Resume...
                          </h4>
                          <p className="text-xs text-slate-500 max-w-xs">
                            Checking every bullet point against your source resume through the zero-fabrication critic.
                          </p>
                        </div>
                      ) : tailoring ? (
                        <div className="space-y-4">
                          {/* Critic Passed Banner */}
                          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              Zero-Fabrication Critic: Passed. All statements are grounded in your real profile.
                            </span>
                          </div>

                          {/* Full Tailored Resume */}
                          <div className="space-y-1.5" ref={resumeRef}>
                            <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                              Full Tailored Resume
                            </span>
                            <div className="p-5 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed shadow-sm">
                              <div className="prose prose-sm max-w-none prose-headings:font-bold prose-a:text-blue-600">
                                <ReactMarkdown>
                                  {tailoring.tailored_resume.full_markdown || "No resume content generated."}
                                </ReactMarkdown>
                              </div>
                            </div>
                          </div>

                          {/* Cover Letter */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                                Tailored Cover Letter
                              </span>
                              <button
                                type="button"
                                onClick={copyCoverLetter}
                                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
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
                              className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none resize-none font-normal"
                            />
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col sm:flex-row gap-3 w-full">
                            <button
                              type="button"
                              onClick={handleApproveTailoring}
                              className="flex-1 py-3 bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span>Approve & Save</span>
                            </button>
                            <button
                              type="button"
                              onClick={downloadResumePdf}
                              className="flex-1 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
                            >
                              <Download className="w-4 h-4" />
                              <span>Download PDF</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleAutoApply}
                              disabled={isApplying}
                              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
                            >
                              {isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                              <span>{isApplying ? "Applying..." : "Auto-Apply"}</span>
                            </button>
                          </div>

                          {applyScreenshot && (
                            <div className="w-full mt-4 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                                <h4 className="text-sm font-bold text-slate-800">Auto-Apply Submission Screenshot</h4>
                              </div>
                              <div className="p-4 flex justify-center bg-slate-100/50">
                                <img src={`data:image/png;base64,${applyScreenshot}`} alt="Submission proof" className="max-w-full rounded shadow-sm border border-slate-200" />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-8 text-center space-y-3 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                          <FileEdit className="w-8 h-8 text-slate-400 mx-auto" />
                          <h4 className="font-heading font-bold text-slate-900 text-sm">
                            Generate Tailored Resume
                          </h4>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            Rewrite summary and bullets specifically for this job description without fabricating claims.
                          </p>
                          <button
                            type="button"
                            onClick={handleTailor}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors"
                          >
                            Generate Tailored Draft
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: INTERVIEW PREP GUIDE */}
                  {activeTab === "prep" && (
                    <div className="space-y-5 max-h-[480px] overflow-y-auto custom-scroll pr-1">
                      {isPrepping ? (
                        <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                          <h4 className="font-heading font-bold text-slate-900 text-base">
                            Synthesizing Interview Guide...
                          </h4>
                          <p className="text-xs text-slate-500 max-w-xs">
                            Researching company talking points and formulating role-specific questions.
                          </p>
                        </div>
                      ) : prep ? (
                        <div className="space-y-5">
                          {/* Company Overview */}
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                              Company Overview
                            </span>
                            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                              {prep.interview_prep.company_overview}
                            </p>
                          </div>

                          {/* Key Talking Points */}
                          <div className="space-y-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                              Your Key Talking Points
                            </span>
                            <ul className="space-y-1.5 text-xs sm:text-sm text-slate-800">
                              {prep.interview_prep.key_talking_points.map((tp, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 p-2.5 rounded-lg bg-white border border-slate-200"
                                >
                                  <span className="text-blue-600 font-bold">•</span>
                                  <span>{tp}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Likely Questions */}
                          <div className="space-y-2.5">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                              Anticipated Interview Questions
                            </span>
                            <div className="space-y-2.5">
                              {prep.interview_prep.likely_questions.map((q, i) => (
                                <div
                                  key={i}
                                  className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                      {i + 1}. {q.question}
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold uppercase shrink-0">
                                      {q.category}
                                    </span>
                                  </div>
                                  <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                                    &ldquo;{q.suggested_answer}&rdquo;
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Download Button */}
                          <button
                            type="button"
                            onClick={downloadPrepMarkdown}
                            className="w-full py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download Interview Sheet (.md)</span>
                          </button>
                        </div>
                      ) : (
                        <div className="p-8 text-center space-y-3 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                          <Brain className="w-8 h-8 text-slate-400 mx-auto" />
                          <h4 className="font-heading font-bold text-slate-900 text-sm">
                            Synthesize Interview Guide
                          </h4>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            Generate tailored questions, suggested answers, and company talking points.
                          </p>
                          <button
                            type="button"
                            onClick={handlePrep}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors"
                          >
                            Generate Guide
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: SKILL BRIDGE LEARNING PATH */}
                  {activeTab === "learn" && (
                    <div className="space-y-4 max-h-[480px] overflow-y-auto custom-scroll pr-1">
                      {isLearning ? (
                        <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                          <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
                          <h4 className="font-heading font-bold text-slate-900 text-base">
                            Building Skill Curriculum...
                          </h4>
                          <p className="text-xs text-slate-500 max-w-xs">
                            Formulating tailored study steps for your identified skill gaps.
                          </p>
                        </div>
                      ) : learnPath ? (
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed space-y-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                            Targeted Curriculum
                          </span>
                          <div className="whitespace-pre-line font-normal">
                            {learnPath}
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center space-y-3 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                          <GraduationCap className="w-8 h-8 text-slate-400 mx-auto" />
                          <h4 className="font-heading font-bold text-slate-900 text-sm">
                            Create Skill Bridge Path
                          </h4>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            Generate a step-by-step study curriculum to bridge identified requirements for this role.
                          </p>
                          <button
                            type="button"
                            onClick={handleLearn}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors"
                          >
                            Create Path
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                /* No Job Selected Empty State */
                <div className="p-12 text-center space-y-4 flex flex-col items-center justify-center min-h-[450px]">
                  <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                    <Briefcase className="w-7 h-7" />
                  </div>
                  <h3 className="font-heading font-bold text-slate-900 text-lg">
                    Select a Role to Inspect
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-xs">
                    Choose an opportunity from the left feed to see semantic reasoning, AI resume tailoring, and customized interview guides.
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
