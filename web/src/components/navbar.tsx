"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Search, Bot, Menu, X, Briefcase, BookmarkCheck, FileText, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { State } from "@/lib/api";

function subscribe(callback: () => void) {
  if (typeof window !== "undefined") {
    window.addEventListener("storage", callback);
    return () => window.removeEventListener("storage", callback);
  }
  return () => {};
}

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userName = useSyncExternalStore(
    subscribe,
    () => State.getProfile()?.name || "Candidate",
    () => "Candidate"
  );

  const navLinks = [
    { href: "/jobs", label: "Find Jobs", icon: Search },
    { href: "/dashboard", label: "Applications", icon: BookmarkCheck },
    { href: "/chat", label: "AI Assistant", icon: Bot },
    { href: "/profile", label: "Profile", icon: FileText },
  ];

  return (
    <header className="sticky top-0 z-50 w-full px-3 sm:px-6 pt-3">
      <div className="max-w-7xl mx-auto rounded-2xl bg-white/75 backdrop-blur-xl border border-violet-100 shadow-[0_8px_30px_-12px_rgba(124,58,237,0.15)]">
        <div className="h-14 px-3 sm:px-4 flex items-center justify-between">

          {/* Brand Logo & Product Mark */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center text-white shadow-lg shadow-violet-500/25 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
              <Briefcase className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-white animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-extrabold text-lg text-slate-900 tracking-tight leading-none">
                JobHunt<span className="text-gradient">.</span>
              </span>
              <span className="text-[10px] text-slate-500 font-medium tracking-wide">
                Intelligent Career Hub
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 relative">
            {navLinks.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all z-10 ${
                    isActive
                      ? "text-violet-700 font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-xl bg-violet-50 border border-violet-100"
                      transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                    />
                  )}
                  <Icon className={`relative w-4 h-4 ${isActive ? "text-violet-600" : "text-slate-400"}`} />
                  <span className="relative">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/jobs"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-gradient text-white text-sm font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Search Jobs</span>
            </Link>

            <Link
              href="/profile"
              className="flex items-center gap-2.5 p-1 pl-1 pr-3 rounded-full hover:bg-violet-50 border border-transparent hover:border-violet-100 transition-colors"
              title="View Profile"
            >
              <div className="w-7 h-7 rounded-full bg-brand-gradient text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden lg:inline text-xs font-semibold text-slate-700 max-w-[100px] truncate">
                {userName.split(" ")[0]}
              </span>
            </Link>

            {/* Mobile Menu Trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:text-violet-700 hover:bg-violet-50 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden overflow-hidden px-3 pb-3"
            >
              <div className="space-y-1 pt-2 border-t border-violet-100">
                {navLinks.map((item, i) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-violet-50 text-violet-700 font-semibold border border-violet-100"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? "text-violet-600" : "text-slate-400"}`} />
                        <span>{item.label}</span>
                      </Link>
                    </motion.div>
                  );
                })}
                <div className="pt-2">
                  <Link
                    href="/jobs"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-brand-gradient text-white text-sm font-semibold shadow-lg shadow-violet-500/25"
                  >
                    <Search className="w-4 h-4" />
                    <span>Search All Jobs</span>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
