"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { API, getRealJobUrl } from "@/lib/api";
import { Application, DashboardResponse } from "@/lib/types";
import { CountUp } from "@/components/ui/count-up";
import { ScoreRing } from "@/components/ui/score-ring";
import {
  FolderGit2,
  ShieldCheck,
  PlaneTakeoff,
  Award,
  AlertCircle,
  Plus,
  ExternalLink,
  Trash2,
  Kanban,
  Table as TableIcon,
  ArrowUpRight,
  Bookmark,
  Zap,
} from "lucide-react";

const STAGES = [
  {
    id: "saved",
    label: "Saved",
    dot: "bg-violet-500",
    header: "from-violet-500 to-indigo-500",
  },
  {
    id: "tailored",
    label: "Tailored",
    dot: "bg-indigo-500",
    header: "from-indigo-500 to-violet-500",
  },
  {
    id: "applied",
    label: "Applied",
    dot: "bg-sky-500",
    header: "from-sky-500 to-indigo-500",
  },
  {
    id: "interview",
    label: "Interviewing",
    dot: "bg-fuchsia-500",
    header: "from-fuchsia-500 to-violet-500",
  },
  {
    id: "offer",
    label: "Offers",
    dot: "bg-emerald-500",
    header: "from-emerald-500 to-teal-500",
  },
];

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    saved: "bg-violet-50 text-violet-700 border-violet-200",
    tailored: "bg-indigo-50 text-indigo-700 border-indigo-200",
    applied: "bg-sky-50 text-sky-700 border-sky-200",
    interview: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
    offer: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-slate-100 text-slate-500 border-slate-200",
  };
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
        styles[status] || styles.saved
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [filterStage, setFilterStage] = useState<string>("all");

  const loadDashboard = async () => {
    try {
      const [dash, apps] = await Promise.all([
        API.getDashboard(),
        API.getApplications(),
      ]);
      setDashboardData(dash);
      setApplications(apps);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([API.getDashboard(), API.getApplications()])
      .then(([dash, apps]) => {
        if (active) {
          setDashboardData(dash);
          setApplications(apps);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard data");
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const advanceApp = async (id: number | undefined, nextStage: string) => {
    if (!id) return;
    try {
      await API.updateStage(id, nextStage);
      await loadDashboard();
    } catch (err: unknown) {
      alert("Could not update stage: " + (err instanceof Error ? err.message : "Error"));
    }
  };

  const deleteApp = async (id: number | undefined) => {
    if (!id) return;
    if (!window.confirm("Remove this application from tracker?")) return;
    try {
      await API.deleteApplication(id);
      await loadDashboard();
    } catch (err: unknown) {
      alert("Delete failed: " + (err instanceof Error ? err.message : "Error"));
    }
  };

  const filteredApplications = applications.filter((app) => {
    if (filterStage === "all") return true;
    return app.status === filterStage;
  });

  if (isLoading) {
    return (
      <main className="w-full flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-2xl bg-brand-gradient opacity-20 animate-ping" />
            <div className="relative w-14 h-14 rounded-2xl bg-brand-gradient flex items-center justify-center text-white shadow-lg shadow-violet-500/30 animate-pulse">
              <Zap className="w-7 h-7" />
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-500">Loading Pipeline Data...</span>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="w-full flex-1 max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 space-y-2">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="font-heading font-bold text-base">Dashboard Error</h3>
          <p className="text-xs">{error}</p>
          <button
            onClick={loadDashboard}
            className="mt-2 px-4 py-1.5 bg-rose-600 text-white rounded-full text-xs font-semibold hover:bg-rose-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  const statCards = [
    {
      label: "Tracked Roles",
      value: dashboardData?.summary?.total || 0,
      icon: FolderGit2,
      gradient: "from-indigo-500 to-violet-500",
    },
    {
      label: "Tailored Resumes",
      value: dashboardData?.summary?.by_status?.tailored || 0,
      icon: ShieldCheck,
      gradient: "from-violet-500 to-fuchsia-500",
    },
    {
      label: "Active In-Flight",
      value: dashboardData?.summary?.active_applications || 0,
      icon: PlaneTakeoff,
      gradient: "from-fuchsia-500 to-rose-500",
    },
    {
      label: "High Match Fit",
      value: dashboardData?.summary?.high_fit_count || 0,
      icon: Award,
      gradient: "from-emerald-500 to-teal-500",
    },
  ];

  return (
    <main className="w-full flex-1 bg-slate-50 min-h-screen py-8 relative overflow-x-clip">
      {/* Ambient aurora */}
      <div className="absolute inset-x-0 top-0 -z-10 h-[380px] overflow-hidden pointer-events-none">
        <div className="animate-blob absolute -top-28 left-1/4 w-[420px] h-[300px] rounded-full bg-violet-200/40 blur-3xl" />
        <div className="animate-blob-delayed absolute -top-20 right-1/4 w-[380px] h-[280px] rounded-full bg-fuchsia-200/30 blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 relative">
        {/* PAGE HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-violet-100"
        >
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Your <span className="text-gradient">Pipeline</span>
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 font-bold text-xs border border-violet-200">
                {applications.length} Tracked
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1">
              Live SQLite status progression from saved bookmark to tailored resume and offer.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-white border border-violet-100 rounded-xl p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("kanban")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === "kanban"
                    ? "bg-brand-gradient text-white shadow-sm shadow-violet-500/25"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>Kanban</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === "table"
                    ? "bg-brand-gradient text-white shadow-sm shadow-violet-500/25"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
            </div>

            <Link
              href="/jobs"
              className="px-4 py-2 bg-brand-gradient text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Explore Roles</span>
            </Link>
          </div>
        </motion.div>

        {/* PRIORITY ACTION ITEMS BANNER */}
        {dashboardData?.pending_actions && dashboardData.pending_actions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 bg-white/80 backdrop-blur border border-amber-200 rounded-2xl space-y-2.5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <span className="relative flex w-2 h-2">
                  <span className="animate-ping absolute inline-flex w-full h-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex w-2 h-2 rounded-full bg-amber-500" />
                </span>
                Priority Follow-ups ({dashboardData.pending_actions.length})
              </span>
            </div>
            <div className="space-y-1.5 pt-1">
              {dashboardData.pending_actions.map((action, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center justify-between text-xs py-1.5 border-b border-amber-100/70 last:border-0 gap-2"
                >
                  <span className="text-slate-800">
                    • <strong>{action.job_title}</strong> at {action.company} —{" "}
                    <span className="text-slate-600">{action.action}</span>
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase self-start sm:self-auto ${
                      action.priority === "urgent"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {action.priority}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* METRIC CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="card-glow rounded-2xl p-4 flex items-center justify-between"
              >
                <div className="space-y-1">
                  <span className="text-xs font-medium text-slate-500">{card.label}</span>
                  <div className="font-heading text-3xl font-black text-slate-900">
                    <CountUp value={card.value} />
                  </div>
                </div>
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white shadow-lg shadow-violet-500/20`}
                >
                  <Icon className="w-5 h-5" />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* PIPELINE WORKSPACE */}
        {applications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card-glow rounded-2xl p-12 text-center space-y-4 max-w-lg mx-auto"
          >
            <div className="animate-float w-14 h-14 rounded-2xl bg-brand-gradient flex items-center justify-center mx-auto text-white shadow-xl shadow-violet-500/25">
              <Bookmark className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-heading font-bold text-slate-900 text-lg">
                No Tracked Applications Yet
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Browse open roles in the Discovery feed, bookmark positions to save them here, or generate
                tailored drafts.
              </p>
            </div>
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-gradient hover:shadow-xl hover:shadow-violet-500/30 text-white rounded-full text-xs font-bold transition-all hover:-translate-y-0.5"
            >
              <span>Explore Roles Now</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </motion.div>
        ) : viewMode === "kanban" ? (
          /* KANBAN BOARD VIEW */
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 items-start pb-6">
            {STAGES.map((stage, stageIdx) => {
              const stageApps = applications.filter((a) => (a.status || "saved") === stage.id);
              return (
                <motion.div
                  key={stage.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: stageIdx * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="bg-white/60 backdrop-blur border border-violet-100 rounded-2xl p-3 flex flex-col min-w-[230px] space-y-3"
                >
                  {/* Column Header */}
                  <div className={`rounded-xl bg-gradient-to-r ${stage.header} px-3 py-2 flex items-center justify-between shadow-sm`}>
                    <span className="font-heading text-xs font-bold text-white flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full bg-white/90 ${stage.dot}`}></span>
                      {stage.label}
                    </span>
                    <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-white/25 text-white backdrop-blur">
                      {stageApps.length}
                    </span>
                  </div>

                  {/* Cards in Column */}
                  <div className="space-y-2.5 min-h-[140px]">
                    <AnimatePresence>
                      {stageApps.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-violet-200 rounded-xl">
                          Drop zone — nothing here yet
                        </div>
                      ) : (
                        stageApps.map((app) => (
                          <motion.div
                            layout
                            key={app.id || app.job_id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            whileHover={{ y: -3 }}
                            className="bg-white border border-violet-100 rounded-xl p-3.5 shadow-sm space-y-2.5 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-500/10 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <span className="text-[11px] font-semibold text-violet-600 block truncate">
                                  {app.company}
                                </span>
                                <h4 className="font-heading text-xs font-bold text-slate-900 leading-snug">
                                  {app.job_title}
                                </h4>
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  {app.location || "Remote"}
                                </span>
                              </div>
                              <ScoreRing score={app.fit_score || 0} size={38} stroke={3.5} />
                            </div>

                            {/* Quick Actions */}
                            <div className="flex items-center justify-between pt-2 border-t border-violet-100/70 text-[11px]">
                              <select
                                value={app.status}
                                onChange={(e) => advanceApp(app.id, e.target.value)}
                                className="bg-violet-50/60 border border-violet-100 rounded-lg px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 focus:outline-none focus:border-violet-400 cursor-pointer"
                              >
                                <option value="saved">Saved</option>
                                <option value="tailored">Tailored</option>
                                <option value="applied">Applied</option>
                                <option value="interview">Interview</option>
                                <option value="offer">Offer</option>
                                <option value="rejected">Rejected</option>
                              </select>

                              <div className="flex items-center gap-1">
                                {app.url && (
                                  <a
                                    href={getRealJobUrl({ url: app.url, company: app.company, title: app.job_title })}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded-md text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                                    title="Open Job Link"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => deleteApp(app.id)}
                                  className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Remove from Tracker"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* TABULAR VIEW */
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-violet-100 shadow-xl shadow-violet-500/10 overflow-hidden"
          >
            <div className="p-3.5 bg-violet-50/40 border-b border-violet-100 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Filter Stage:</span>
                <select
                  className="bg-white border border-violet-200/70 rounded-lg px-2 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:border-violet-500"
                  value={filterStage}
                  onChange={(e) => setFilterStage(e.target.value)}
                >
                  <option value="all">All Stages ({applications.length})</option>
                  <option value="saved">Saved</option>
                  <option value="tailored">Tailored</option>
                  <option value="applied">Applied</option>
                  <option value="interview">Interview</option>
                  <option value="offer">Offer</option>
                </select>
              </div>
              <span className="text-slate-500 font-medium">{filteredApplications.length} entries</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-violet-50/40 border-b border-violet-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Role & Company</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Fit Score</th>
                    <th className="py-3 px-4">Pipeline Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-violet-100/60">
                  {filteredApplications.map((app) => (
                    <tr key={app.id || app.job_id} className="hover:bg-violet-50/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{app.job_title}</span>
                        <span className="text-violet-600 text-[11px] font-semibold">{app.company}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{app.location || "Remote"}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full font-bold bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white text-[11px] shadow-sm">
                          {app.fit_score}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={app.status}
                          onChange={(e) => advanceApp(app.id, e.target.value)}
                          className="bg-white border border-violet-200/70 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:border-violet-500 cursor-pointer"
                        >
                          <option value="saved">Saved</option>
                          <option value="tailored">Tailored</option>
                          <option value="applied">Applied</option>
                          <option value="interview">Interview</option>
                          <option value="offer">Offer</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        {app.url && (
                          <a
                            href={getRealJobUrl({ url: app.url, company: app.company, title: app.job_title })}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-violet-700 hover:text-violet-900 font-semibold text-xs"
                          >
                            <span>Link</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteApp(app.id)}
                          className="text-rose-600 hover:text-rose-800 font-semibold text-xs"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
