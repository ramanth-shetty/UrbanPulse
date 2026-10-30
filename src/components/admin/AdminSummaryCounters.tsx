'use client';

import React from 'react';
import Link from 'next/link';

interface AdminSummaryCountersProps {
  totalOpen: number;
  criticalCount: number;
  reviewQueueCount: number;
  totalIncidents: number;
}

export default function AdminSummaryCounters({
  totalOpen,
  criticalCount,
  reviewQueueCount,
  totalIncidents,
}: AdminSummaryCountersProps) {
  return (
    <div className="space-y-2">
      {/* Honesty Pill */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span>🏛️ Mysuru Operations Center</span>
          <span className="text-slate-300">|</span>
          <Link
            href="/admin/brief"
            className="text-[11px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1"
          >
            <span>📋 Morning Brief →</span>
          </Link>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
          🧪 Synthetic Data & Simulated Routing
        </span>
      </div>

      {/* Counter Grid */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* 1. Open Incidents */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Active Incidents
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {totalOpen}
            </span>
            <span className="text-[10px] text-slate-400">of {totalIncidents} total</span>
          </div>
        </div>

        {/* 2. Critical Priority */}
        <div className="bg-red-50/70 p-3 rounded-xl border border-red-200 shadow-xs">
          <div className="text-[11px] font-semibold text-red-800 uppercase tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping inline-block" />
            Critical Hazards
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold text-red-700">
              {criticalCount}
            </span>
            <span className="text-[10px] text-red-600 font-medium">Priority &ge; 80</span>
          </div>
        </div>

        {/* 3. Review Queue */}
        <Link
          href="/admin/review"
          className="bg-amber-50/70 hover:bg-amber-100/80 transition-colors p-3 rounded-xl border border-amber-200 shadow-xs block group"
        >
          <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider flex items-center justify-between">
            <span>Review Queue</span>
            <span className="text-[10px] text-amber-600 group-hover:translate-x-0.5 transition-transform">→</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold text-amber-800">
              {reviewQueueCount}
            </span>
            <span className="text-[10px] text-amber-700 font-medium">Suspicion flagged</span>
          </div>
        </Link>
      </div>
    </div>
  );
}

