"use client";

import { motion } from "framer-motion";

export function ScoreRing({
  score,
  size = 48,
  stroke = 4,
  className = "",
  animateOnMount = true,
}: {
  score: number;
  size?: number;
  stroke?: number;
  className?: string;
  animateOnMount?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - clamped / 100);
  const fontSize = Math.max(10, Math.round(size * 0.28));

  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ede9fe" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ringGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: animateOnMount ? offset : offset }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center font-extrabold text-violet-700"
        style={{ fontSize }}
      >
        {Math.round(clamped)}
      </span>
    </div>
  );
}
