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
      <div className="bg-white rounded-md p-8 border border-slate-200 text-center space-y-1.5">
        <div className="text-sm font-semibold text-slate-800">No Incidents Found</div>
        <div className="text-xs text-slate-500">
          No complaints match the selected filter criteria.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
      {incidents.map((inc) => {
        const isSelected = selectedIncident?.id === inc.id;

        let priorityBadgeColor = 'bg-slate-100 text-slate-800 border-slate-300';
        if (inc.priorityScore >= 80) {
          priorityBadgeColor = 'bg-red-50 text-red-800 border-red-300';
        } else if (inc.priorityScore >= 60) {
          priorityBadgeColor = 'bg-amber-50 text-amber-800 border-amber-300';
        }

        const isReopened = inc.status === 'reopened' || inc.closureUnreliable;
        const isVerified = inc.verificationStatus === 'verified' || inc.status === 'citizen_verified';

        return (
          <div
            key={inc.id}
            onClick={() => onSelectIncident(inc)}
            className={`p-3 rounded-md border transition-colors cursor-pointer bg-white text-left ${
              isReopened
                ? 'border-red-300 bg-red-50/20'
                : isSelected
                ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
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
                  <span className="text-[9px] font-mono font-medium text-slate-500 bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
                    SYNTHETIC
                  </span>
                )}
                {isReopened && (
                  <span className="text-[9px] font-mono font-bold text-red-800 bg-red-50 px-1 py-0.2 rounded border border-red-200">
                    REOPENED
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {inc.reportCount > 1 && (
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-800 border border-slate-200">
                    {inc.reportCount} reports
                  </span>
                )}
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${priorityBadgeColor}`}>
                  P: {inc.priorityScore}
                </span>
              </div>
            </div>

            {/* Merged Summary */}
            <div className="mt-1.5 text-xs text-slate-800 font-medium line-clamp-2 leading-relaxed">
              {inc.mergedSummary}
            </div>

            {/* Footer: Departments, Status */}
            <div className="mt-2 flex items-center justify-between text-[10px] pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-medium uppercase tracking-wider">
                  {inc.leadDepartment.replace('_', ' ')}
                </span>
                {inc.supportingDepartments?.map((d) => (
                  <span key={d} className="px-1 py-0.2 rounded bg-slate-50 text-slate-500 border border-slate-200 uppercase tracking-wider">
                    +{d.replace('_', ' ')}
                  </span>
                ))}
              </div>

              {isReopened ? (
                <span className="font-mono font-bold uppercase tracking-wider text-red-800 bg-red-50 px-1.5 py-0.2 rounded border border-red-200">
                  Closure Unreliable
                </span>
              ) : isVerified ? (
                <span className="font-mono font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                  Citizen Verified
                </span>
              ) : (
                <span className="font-mono uppercase tracking-wider text-slate-500 bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200">
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
