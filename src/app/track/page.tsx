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
    <div className="space-y-4 max-w-md mx-auto pt-4 text-left">
      <div className="bg-white rounded-md p-6 border border-slate-200 space-y-4">
        <div>
          <h1 className="text-base font-bold text-slate-900">Track Civic Complaint</h1>
          <p className="text-xs text-slate-500 mt-1">
            Enter tracking ID (e.g. <span className="font-mono font-semibold text-slate-700">RPT-001</span>) to view resolution timeline, linked incidents, and verify the fix.
          </p>
        </div>

        <form onSubmit={handleTrackSubmit} className="space-y-3">
          <input
            type="text"
            value={trackId}
            onChange={(e) => setTrackId(e.target.value)}
            placeholder="e.g. RPT-001"
            className="w-full text-xs px-3 py-2.5 rounded-md border border-slate-300 placeholder-slate-400 focus:outline-hidden focus:border-slate-800 font-mono uppercase"
          />

          <button
            type="submit"
            className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2.5 px-4 rounded-md transition-colors"
          >
            Track Status &rarr;
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <Link href="/report/new" className="text-slate-800 hover:text-black font-semibold">
            + Report New Issue
          </Link>
          <Link href="/admin" className="text-slate-500 hover:text-slate-800">
            Admin Operations
          </Link>
        </div>
      </div>
    </div>
  );
}
