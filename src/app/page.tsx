'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [trackId, setTrackId] = useState('');

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackId.trim()) {
      window.location.href = `/track/${encodeURIComponent(trackId.trim())}`;
    }
  };

  return (
    <div className="space-y-6 pt-2">
      {/* Hero Card */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white rounded-3xl p-6 shadow-md text-center space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-xs font-semibold text-emerald-100 border border-white/20">
          <span>🏛️ Mysuru Civic Pulse</span>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Fixing Mysuru, One Pulse at a Time
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100 max-w-sm mx-auto leading-relaxed">
            Report road hazards, water leaks, garbage piles, or electrical issues in under a minute.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/report/new"
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-5 bg-white text-emerald-800 hover:bg-emerald-50 active:bg-emerald-100 rounded-2xl font-bold shadow-sm transition-transform active:scale-[0.98] text-sm"
          >
            <span>📢 Report an Issue Now</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* Track Ticket Box */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-slate-800">Track an Existing Report</h2>
          <p className="text-xs text-slate-500">
            Enter your tracking ID (e.g. <span className="font-mono text-slate-600 font-semibold">RPT-001</span>) to see live resolution status.
          </p>
        </div>

        <form onSubmit={handleTrackSubmit} className="flex gap-2">
          <input
            type="text"
            value={trackId}
            onChange={(e) => setTrackId(e.target.value)}
            placeholder="Enter Report ID"
            className="flex-1 text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono uppercase"
          />
          <button
            type="submit"
            className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            Track
          </button>
        </form>
      </div>

      {/* Feature highlights */}
      <div className="grid grid-cols-2 gap-3 text-left">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <div className="text-base">⚡</div>
          <div className="text-xs font-bold text-slate-800">Fast 1-Min Capture</div>
          <div className="text-[11px] text-slate-500 leading-tight">
            Photo, GPS pin, & text in English, Kannada, or Hindi.
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <div className="text-base">🎯</div>
          <div className="text-xs font-bold text-slate-800">Smart Deduplication</div>
          <div className="text-[11px] text-slate-500 leading-tight">
            Multiple reports merge into a single actionable incident.
          </div>
        </div>
      </div>

      <div className="text-center pt-2">
        <Link
          href="/admin"
          className="text-xs font-medium text-slate-400 hover:text-slate-600 underline underline-offset-4"
        >
          City Admin Dashboard & Map →
        </Link>
      </div>
    </div>
  );
}

