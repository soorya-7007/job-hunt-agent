"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API, getRealJobUrl } from "@/lib/api";
import { Application, DashboardResponse } from "@/lib/types";
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
} from "lucide-react";

const STAGES = [
  { id: "saved", label: "Saved Jobs", badge: "bg-slate-100 text-slate-700" },
  { id: "tailored", label: "Tailored Resumes", badge: "bg-indigo-50 text-indigo-700" },
  { id: "applied", label: "Applied", badge: "bg-blue-50 text-blue-700" },
  { id: "interview", label: "Interviewing", badge: "bg-purple-50 text-purple-700" },
  { id: "offer", label: "Offers", badge: "bg-emerald-50 text-emerald-700" },
];

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
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
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
            className="mt-2 px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full flex-1 bg-slate-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Application Pipeline & Saved Roles
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">
                {applications.length} Tracked
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1">
              Live SQLite status progression from saved bookmark to tailored resume and offer.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setViewMode("kanban")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  viewMode === "kanban"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>Kanban</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  viewMode === "table"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
            </div>

            <Link
              href="/jobs"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Explore Roles</span>
            </Link>
          </div>
        </div>

        {/* PRIORITY ACTION ITEMS BANNER */}
        {dashboardData?.pending_actions && dashboardData.pending_actions.length > 0 && (
          <div className="p-4 bg-white border border-amber-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Priority Follow-up Items ({dashboardData.pending_actions.length})
              </span>
            </div>
            <div className="space-y-1.5 pt-1">
              {dashboardData.pending_actions.map((action, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0 gap-2"
                >
                  <span className="text-slate-800">
                    • <strong>{action.job_title}</strong> at {action.company} —{" "}
                    <span className="text-slate-600">{action.action}</span>
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase self-start sm:self-auto ${
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
          </div>
        )}

        {/* 4 REFINED METRIC CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-subtle rounded-xl p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500">Tracked Roles</span>
              <div className="font-heading text-2xl font-black text-slate-900">
                {dashboardData?.summary?.total || 0}
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FolderGit2 className="w-5 h-5" />
            </div>
          </div>

          <div className="card-subtle rounded-xl p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500">Tailored Resumes</span>
              <div className="font-heading text-2xl font-black text-slate-900">
                {dashboardData?.summary?.by_status?.tailored || 0}
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="card-subtle rounded-xl p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500">Active In-Flight</span>
              <div className="font-heading text-2xl font-black text-slate-900">
                {dashboardData?.summary?.active_applications || 0}
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <PlaneTakeoff className="w-5 h-5" />
            </div>
          </div>

          <div className="card-subtle rounded-xl p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500">High Match Fit</span>
              <div className="font-heading text-2xl font-black text-slate-900">
                {dashboardData?.summary?.high_fit_count || 0}
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* PIPELINE WORKSPACE */}
        {applications.length === 0 ? (
          /* Empty State */
          <div className="card-subtle rounded-2xl p-12 text-center space-y-4 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Bookmark className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-heading font-bold text-slate-900 text-lg">
                No Tracked Applications Yet
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Browse open roles in the Discovery feed, bookmark positions to save them here, or generate tailored drafts.
              </p>
            </div>
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              <span>Explore Roles Now</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        ) : viewMode === "kanban" ? (
          /* KANBAN BOARD VIEW */
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start overflow-x-auto pb-6 custom-scroll">
            {STAGES.map((stage) => {
              const stageApps = applications.filter((a) => (a.status || "saved") === stage.id);
              return (
                <div
                  key={stage.id}
                  className="bg-slate-100/70 border border-slate-200/80 rounded-xl p-3 flex flex-col min-w-[240px] space-y-3"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-1">
                    <span className="font-heading text-xs font-bold text-slate-800">
                      {stage.label}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">
                      {stageApps.length}
                    </span>
                  </div>

                  {/* Cards in Column */}
                  <div className="space-y-2.5 min-h-[160px]">
                    {stageApps.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
                        Empty
                      </div>
                    ) : (
                      stageApps.map((app) => (
                        <div
                          key={app.id || app.job_id}
                          className="bg-white border border-slate-200/90 rounded-lg p-3.5 shadow-xs space-y-2.5 hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[11px] font-semibold text-slate-500 block truncate">
                                {app.company}
                              </span>
                              <h4 className="font-heading text-xs font-bold text-slate-900 leading-snug">
                                {app.job_title}
                              </h4>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                {app.location || "Remote"}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                              {app.fit_score}%
                            </span>
                          </div>

                          {/* Quick Actions */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                            {/* Next Stage Selector */}
                            <select
                              value={app.status}
                              onChange={(e) => advanceApp(app.id, e.target.value)}
                              className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-medium text-slate-700 focus:outline-none"
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
                                  className="p-1 text-slate-400 hover:text-blue-600"
                                  title="Open Job Link"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => deleteApp(app.id)}
                                className="p-1 text-slate-400 hover:text-rose-600"
                                title="Remove from Tracker"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* TABULAR VIEW */
          <div className="card-subtle rounded-xl overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Filter Stage:</span>
                <select
                  className="bg-white border border-slate-300 rounded-md px-2 py-1 text-xs font-medium text-slate-700 focus:outline-none"
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
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Role & Company</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Fit Score</th>
                    <th className="py-3 px-4">Pipeline Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredApplications.map((app) => (
                    <tr key={app.id || app.job_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{app.job_title}</span>
                        <span className="text-slate-500 text-[11px]">{app.company}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{app.location || "Remote"}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px]">
                          {app.fit_score}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={app.status}
                          onChange={(e) => advanceApp(app.id, e.target.value)}
                          className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none"
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
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold text-xs"
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
          </div>
        )}
      </div>
    </main>
  );
}
