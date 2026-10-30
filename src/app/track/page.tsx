'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function TrackSearchPage() {
  const [trackId, setTrackId] = useState('');

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackId.trim()) {
      window.location.href = `/track/${encodeURIComponent(trackId.trim())}`;
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto pt-4 text-left">
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Track Civic Complaint</h1>
          <p className="text-xs text-slate-500 mt-1">
            Enter your tracking ID (e.g. <span className="font-mono font-semibold text-slate-700">RPT-001</span>) to view resolution timeline, linked incidents, and verify the fix.
          </p>
        </div>

        <form onSubmit={handleTrackSubmit} className="space-y-3">
          <input
            type="text"
            value={trackId}
            onChange={(e) => setTrackId(e.target.value)}
            placeholder="e.g. RPT-001"
            className="w-full text-sm px-4 py-3 rounded-2xl border border-slate-300 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono uppercase"
          />

          <button
            type="submit"
            className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-3 px-4 rounded-2xl transition-colors shadow-xs"
          >
            Track Status →
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <Link href="/report/new" className="text-emerald-700 hover:text-emerald-800 font-semibold">
            + Report New Issue
          </Link>
          <Link href="/admin" className="text-slate-500 hover:text-slate-700">
            Admin Map
          </Link>
        </div>
      </div>
    </div>
  );
}

