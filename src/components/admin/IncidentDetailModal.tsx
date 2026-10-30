'use client';

import React, { useState } from 'react';
import type { Incident } from '@/types/incident';
import type { IncidentStatus } from '@/types/status';

interface IncidentDetailModalProps {
  incident: Incident | null;
  onClose: () => void;
  onStatusUpdated?: (incidentId: string, newStatus: IncidentStatus) => void;
}

export default function IncidentDetailModal({
  incident,
  onClose,
  onStatusUpdated,
}: IncidentDetailModalProps) {
  const [updating, setUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<IncidentStatus>(
    incident?.status || 'new'
  );

  if (!incident) return null;

  const handleStatusChange = async (newStatus: IncidentStatus) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/incidents/${incident.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setCurrentStatus(newStatus);
        if (onStatusUpdated) {
          onStatusUpdated(incident.id, newStatus);
        }
      }
    } catch (err) {
      console.warn('Status update failed:', err);
    } finally {
      setUpdating(false);
    }
  };

  const { priorityFactors } = incident;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40">
      <div
        className="bg-white rounded-md max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-300 flex flex-col text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-slate-900">
              {incident.id}
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded border border-slate-300 bg-slate-100 text-slate-800">
              P: {incident.priorityScore}/100
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3.5 text-xs">
          {/* Status Bar */}
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-md border border-slate-200">
            <div className="space-y-0.5">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Current Status
              </div>
              <div className="font-bold text-slate-900 uppercase font-mono tracking-wide">
                {currentStatus.replace('_', ' ')}
              </div>
            </div>

            {/* Quick Status Advance */}
            <div className="flex items-center gap-1.5">
              {currentStatus !== 'in_progress' && currentStatus !== 'resolved' && (
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleStatusChange('in_progress')}
                  className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs transition-colors disabled:opacity-50"
                >
                  Start Work
                </button>
              )}
              {currentStatus !== 'resolved' && (
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleStatusChange('resolved')}
                  className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors disabled:opacity-50"
                >
                  Mark Resolved
                </button>
              )}
            </div>
          </div>

          {/* Closure Unreliable Alert */}
          {(incident.closureUnreliable || currentStatus === 'reopened') && (
            <div className="bg-red-50 border border-red-300 p-3 rounded-md text-red-900 space-y-0.5">
              <div className="font-bold uppercase tracking-wide text-[10px] text-red-800">
                Disputed by Citizen: Closure Unreliable
              </div>
              <p className="text-xs text-red-800 leading-normal">
                On-site inspection confirmed this issue was incomplete. Reopened with elevated priority (+20 pts to {incident.priorityScore}/100).
              </p>
            </div>
          )}

          {incident.verificationStatus === 'verified' && (
            <div className="bg-slate-50 border border-slate-300 p-3 rounded-md text-slate-900 space-y-0.5">
              <div className="font-bold uppercase tracking-wide text-[10px] text-slate-800">
                Citizen-Verified Fix
              </div>
              <p className="text-xs text-slate-600">
                Citizen on-site inspection confirmed the issue is fully resolved.
              </p>
            </div>
          )}

          {/* Merged Summary */}
          <div className="space-y-1">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Merged Incident Summary
            </div>
            <p className="text-xs font-medium text-slate-800 bg-slate-50 p-3 rounded-md border border-slate-200 leading-relaxed">
              {incident.mergedSummary}
            </p>
          </div>

          {/* Root Cause Guess */}
          {incident.rootCauseGuess && (
            <div className="bg-slate-50 p-3 rounded-md border border-slate-200 space-y-0.5">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Root Cause Assessment
              </div>
              <p className="text-xs text-slate-800 font-medium leading-relaxed">
                {incident.rootCauseGuess}
              </p>
            </div>
          )}

          {/* Department Routing */}
          <div className="bg-slate-50 p-3 rounded-md border border-slate-200 space-y-1.5">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Department Routing
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-semibold text-xs uppercase tracking-wide">
                Lead: {incident.leadDepartment.replace('_', ' ')}
              </span>
              {incident.supportingDepartments?.map((dept) => (
                <span
                  key={dept}
                  className="px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-700 font-medium text-xs uppercase tracking-wide"
                >
                  Supporting: {dept.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>

          {/* Deterministic Priority Breakdown */}
          {priorityFactors && (
            <div className="bg-slate-50 p-3 rounded-md border border-slate-200 space-y-2">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex justify-between items-center">
                <span>Deterministic Priority Factors</span>
                <span className="text-[9px] font-mono text-slate-500">Auditable Calculation</span>
              </div>

              <div className="space-y-1.5">
                {[
                  { name: 'Safety Risk (30%)', val: priorityFactors.safetyRisk },
                  { name: 'People Affected (20%)', val: priorityFactors.peopleAffected },
                  { name: 'Facility Proximity (15%)', val: priorityFactors.sensitiveLocation },
                  { name: 'Visual Evidence (15%)', val: priorityFactors.imageSeverity },
                  { name: 'Age Duration (10%)', val: priorityFactors.age },
                  { name: 'Recurrence History (10%)', val: priorityFactors.recurrenceHistory },
                ].map(({ name, val }) => (
                  <div key={name} className="space-y-0.5">
                    <div className="flex justify-between text-[10px] text-slate-600 font-medium font-mono">
                      <span>{name}</span>
                      <span>{(val * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded h-1 overflow-hidden">
                      <div
                        className="h-full bg-slate-800 rounded transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, val * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Linked Citizen Reports */}
          <div className="space-y-1">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Linked Citizen Reports ({incident.memberReportIds.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {incident.memberReportIds.map((id) => (
                <span
                  key={id}
                  className="font-mono text-[10px] font-medium bg-white border border-slate-300 text-slate-700 px-1.5 py-0.5 rounded"
                >
                  {id}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          <a
            href={`/admin/incidents/${incident.id}`}
            className="text-xs font-semibold text-slate-900 hover:underline"
          >
            Open Dossier & Full Ranking &rarr;
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
