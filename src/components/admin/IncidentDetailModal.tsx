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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-10">
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-bold text-slate-900">
              {incident.id}
            </span>
            <span
              className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${
                incident.priorityScore >= 80
                  ? 'bg-red-100 text-red-800 border-red-300'
                  : incident.priorityScore >= 60
                  ? 'bg-orange-100 text-orange-800 border-orange-300'
                  : 'bg-yellow-100 text-yellow-800 border-yellow-300'
              }`}
            >
              Priority: {incident.priorityScore}/100
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 text-xs">
          {/* Status Bar */}
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="space-y-0.5">
              <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                Current Status
              </div>
              <div className="font-bold text-slate-800 uppercase tracking-wide">
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
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-[11px] transition-colors disabled:opacity-50"
                >
                  Start Work
                </button>
              )}
              {currentStatus !== 'resolved' && (
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleStatusChange('resolved')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] transition-colors disabled:opacity-50"
                >
                  Mark Resolved
                </button>
              )}
            </div>
          </div>

          {/* Closure Unreliable Alert */}
          {(incident.closureUnreliable || currentStatus === 'reopened') && (
            <div className="bg-rose-50 border-2 border-rose-300 p-3.5 rounded-2xl flex items-start gap-2.5 text-rose-950 animate-in fade-in">
              <span className="text-xl leading-none">⚠️</span>
              <div className="space-y-0.5">
                <div className="font-extrabold uppercase tracking-wide text-[10px] text-rose-800">
                  Disputed by Citizen: Closure Unreliable
                </div>
                <p className="text-xs text-rose-950 font-medium leading-relaxed">
                  Reporting citizen conducted on-site verification and confirmed this issue is NOT resolved. Incident reopened with elevated priority (+20 pts to {incident.priorityScore}/100).
                </p>
              </div>
            </div>
          )}

          {incident.verificationStatus === 'verified' && (
            <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-2xl flex items-start gap-2 text-emerald-950">
              <span className="text-lg leading-none">✅</span>
              <div>
                <div className="font-extrabold uppercase tracking-wide text-[10px] text-emerald-800">
                  Citizen-Verified Fix
                </div>
                <p className="text-xs text-emerald-900 font-medium">
                  Citizen on-site inspection confirmed the issue is fully resolved.
                </p>
              </div>
            </div>
          )}

          {/* Merged Summary */}
          <div className="space-y-1">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Merged Incident Summary
            </div>
            <p className="text-sm font-medium text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
              {incident.mergedSummary}
            </p>
          </div>

          {/* Root Cause Guess */}
          {incident.rootCauseGuess && (
            <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-amber-900 tracking-wider">
                <span>🔍 AI Root Cause Deduction</span>
                <span className="text-[9px] font-normal text-amber-700">(Simulated)</span>
              </div>
              <p className="text-xs text-amber-950 font-medium leading-relaxed">
                {incident.rootCauseGuess}
              </p>
            </div>
          )}

          {/* Department Routing */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Department Assignment
              </span>
              <span className="text-[9px] font-semibold text-slate-400">
                Simulated Municipal Routing
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-bold text-xs uppercase tracking-wide">
                Lead: {incident.leadDepartment.replace('_', ' ')}
              </span>
              {incident.supportingDepartments?.map((dept) => (
                <span
                  key={dept}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold text-xs uppercase tracking-wide"
                >
                  Supporting: {dept.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>

          {/* Deterministic Priority Breakdown */}
          {priorityFactors && (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex justify-between items-center">
                <span>Deterministic Priority Factors</span>
                <span className="text-[9px] font-mono text-slate-500">Auditable Equation</span>
              </div>

              <div className="space-y-1.5">
                {[
                  { name: 'Safety Hazard (Weight 30%)', val: priorityFactors.safetyRisk, color: 'bg-red-500' },
                  { name: 'People Affected (Weight 20%)', val: priorityFactors.peopleAffected, color: 'bg-blue-500' },
                  { name: 'Sensitive Proximity (Weight 15%)', val: priorityFactors.sensitiveLocation, color: 'bg-purple-500' },
                  { name: 'Visual Evidence (Weight 15%)', val: priorityFactors.imageSeverity, color: 'bg-amber-500' },
                  { name: 'Age Urgency (Weight 10%)', val: priorityFactors.age, color: 'bg-teal-500' },
                  { name: 'Recurrence History (Weight 10%)', val: priorityFactors.recurrenceHistory, color: 'bg-rose-500' },
                ].map(({ name, val, color }) => (
                  <div key={name} className="space-y-0.5">
                    <div className="flex justify-between text-[10px] text-slate-600 font-medium">
                      <span>{name}</span>
                      <span>{(val * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all`}
                        style={{ width: `${Math.min(100, Math.max(0, val * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Match Reasons */}
          {incident.matchReasons && incident.matchReasons.length > 0 && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Cluster Correlation Reasons
              </div>
              <ul className="space-y-1 text-[11px] text-slate-600">
                {incident.matchReasons.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Corroborating Citizen Reports */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Linked Citizen Reports ({incident.memberReportIds.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {incident.memberReportIds.map((id) => (
                <span
                  key={id}
                  className="font-mono text-[11px] font-semibold bg-white border border-slate-300 text-slate-700 px-2 py-1 rounded-lg"
                >
                  {id}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          <a
            href={`/admin/incidents/${incident.id}`}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors flex items-center gap-1"
          >
            <span>Open Full View & Comparison</span>
            <span>→</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

