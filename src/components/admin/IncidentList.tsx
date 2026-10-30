'use client';

import React from 'react';
import type { Incident } from '@/types/incident';

interface IncidentListProps {
  incidents: Incident[];
  selectedIncident: Incident | null;
  onSelectIncident: (inc: Incident) => void;
}

export default function IncidentList({
  incidents,
  selectedIncident,
  onSelectIncident,
}: IncidentListProps) {
  if (incidents.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-2">
        <span className="text-2xl">📋</span>
        <div className="text-sm font-semibold text-slate-700">No Incidents Found</div>
        <div className="text-xs text-slate-400">
          Try clearing department filters or loading synthetic seed data.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
      {incidents.map((inc) => {
        const isSelected = selectedIncident?.id === inc.id;

        let priorityBadgeColor = 'bg-green-100 text-green-800 border-green-200';
        if (inc.priorityScore >= 80) {
          priorityBadgeColor = 'bg-red-100 text-red-800 border-red-200';
        } else if (inc.priorityScore >= 60) {
          priorityBadgeColor = 'bg-orange-100 text-orange-800 border-orange-200';
        } else if (inc.priorityScore >= 35) {
          priorityBadgeColor = 'bg-yellow-100 text-yellow-800 border-yellow-200';
        }

        const isReopened = inc.status === 'reopened' || inc.closureUnreliable;
        const isVerified = inc.verificationStatus === 'verified' || inc.status === 'citizen_verified';

        return (
          <div
            key={inc.id}
            onClick={() => onSelectIncident(inc)}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer bg-white text-left shadow-2xs hover:shadow-xs ${
              isReopened
                ? 'border-rose-300 bg-rose-50/20 ring-1 ring-rose-400/40'
                : isSelected
                ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            {/* Header: ID, Priority, Synthetic tag */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-bold text-slate-900">
                  {inc.id}
                </span>
                {inc.synthetic && (
                  <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    Synthetic
                  </span>
                )}
                {isReopened && (
                  <span className="text-[9px] font-extrabold text-rose-800 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300">
                    REOPENED
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {inc.reportCount > 1 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                    <span>⚡</span>
                    <span>{inc.reportCount} reports</span>
                  </span>
                )}
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${priorityBadgeColor}`}>
                  P: {inc.priorityScore}
                </span>
              </div>
            </div>

            {/* Merged Summary */}
            <div className="mt-1.5 text-xs text-slate-700 font-medium line-clamp-2 leading-relaxed">
              {inc.mergedSummary}
            </div>

            {/* Footer: Departments, Status */}
            <div className="mt-2.5 flex items-center justify-between text-[10px] pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium capitalize">
                  {inc.leadDepartment.replace('_', ' ')}
                </span>
                {inc.supportingDepartments?.map((d) => (
                  <span key={d} className="px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-200 capitalize">
                    +{d.replace('_', ' ')}
                  </span>
                ))}
              </div>

              {isReopened ? (
                <span className="font-extrabold uppercase tracking-wider text-rose-800 bg-rose-100 px-2 py-0.5 rounded border border-rose-300 flex items-center gap-1">
                  <span>⚠️</span>
                  <span>Unreliable Closure</span>
                </span>
              ) : isVerified ? (
                <span className="font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                  ✓ Verified
                </span>
              ) : (
                <span className="font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                  {inc.status.replace('_', ' ')}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

