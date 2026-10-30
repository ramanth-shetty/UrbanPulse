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
      {/* Meta Bar */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-500 font-medium">
          <span className="font-semibold text-slate-900">Mysuru Operations Command</span>
          <span className="text-slate-300">|</span>
          <Link
            href="/admin/brief"
            className="text-slate-700 hover:text-black font-semibold"
          >
            Morning Brief &rarr;
          </Link>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
          Synthetic Evaluation Dataset
        </span>
      </div>

      {/* Counter Grid */}
      <div className="grid grid-cols-3 gap-2 text-left">
        {/* 1. Open Incidents */}
        <div className="bg-white p-3.5 rounded-md border border-slate-200">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Active Incidents
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
              {totalOpen}
            </span>
            <span className="text-[10px] text-slate-400">/ {totalIncidents} total</span>
          </div>
        </div>

        {/* 2. Critical Priority */}
        <div className="bg-white p-3.5 rounded-md border border-red-200">
          <div className="text-[11px] font-bold text-red-800 uppercase tracking-wider">
            Critical Hazards
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold font-mono text-red-700">
              {criticalCount}
            </span>
            <span className="text-[10px] text-red-600 font-mono">P &ge; 80</span>
          </div>
        </div>

        {/* 3. Review Queue */}
        <Link
          href="/admin/review"
          className="bg-white hover:bg-slate-50 transition-colors p-3.5 rounded-md border border-slate-200 block"
        >
          <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
            <span>Review Queue</span>
            <span className="text-[10px] text-slate-400">&rarr;</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
              {reviewQueueCount}
            </span>
            <span className="text-[10px] text-slate-500">Flagged for Triage</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
