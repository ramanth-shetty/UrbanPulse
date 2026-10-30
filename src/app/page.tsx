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
    <div className="space-y-4 pt-2 max-w-2xl mx-auto">
      {/* Hero Overview */}
      <div className="bg-slate-900 text-white rounded-md p-6 border border-slate-800 text-left space-y-4">
        <div className="inline-block px-2.5 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider text-slate-300 bg-slate-800 border border-slate-700">
          City of Mysuru • Civic Incident Management
        </div>

        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Municipal Complaint & Infrastructure Operations
          </h1>
          <p className="text-xs text-slate-400 max-w-lg leading-relaxed">
            Report road damage, drainage overflow, garbage accumulation, or electrical hazards. Complaints are automatically clustered into root-cause incidents for municipal field resolution.
          </p>
        </div>

        <div>
          <Link
            href="/report/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-md font-semibold text-xs transition-colors"
          >
            Submit Incident Report
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>

      {/* Track Ticket Box */}
      <div className="bg-white rounded-md p-5 border border-slate-200 text-left space-y-3">
        <div className="space-y-0.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Track Complaint Status</h2>
          <p className="text-xs text-slate-500">
            Enter tracking ID (e.g. <span className="font-mono text-slate-700 font-semibold">RPT-001</span>) to view resolution timeline and verify completion.
          </p>
        </div>

        <form onSubmit={handleTrackSubmit} className="flex gap-2">
          <input
            type="text"
            value={trackId}
            onChange={(e) => setTrackId(e.target.value)}
            placeholder="e.g. RPT-001"
            className="flex-1 text-xs px-3 py-2 rounded-md border border-slate-300 placeholder-slate-400 focus:outline-hidden focus:border-slate-600 font-mono uppercase"
          />
          <button
            type="submit"
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-md transition-colors"
          >
            Track
          </button>
        </form>
      </div>

      {/* Feature Architecture Cards */}
      <div className="grid grid-cols-2 gap-3 text-left">
        <div className="bg-white p-4 rounded-md border border-slate-200 space-y-1">
          <div className="text-xs font-bold text-slate-800">Direct Multilingual Intake</div>
          <div className="text-[11px] text-slate-500 leading-normal">
            Processes citizen submissions in Kannada, Hindi, or English with location coordinates.
          </div>
        </div>

        <div className="bg-white p-4 rounded-md border border-slate-200 space-y-1">
          <div className="text-xs font-bold text-slate-800">Spatiotemporal Clustering</div>
          <div className="text-[11px] text-slate-500 leading-normal">
            Merges duplicate complaints within 150m into a single actionable municipal work order.
          </div>
        </div>
      </div>

      <div className="text-center pt-2">
        <Link
          href="/admin"
          className="text-xs font-medium text-slate-600 hover:text-slate-900 underline underline-offset-4"
        >
          Municipal Operations Center &rarr;
        </Link>
      </div>
    </div>
  );
}
