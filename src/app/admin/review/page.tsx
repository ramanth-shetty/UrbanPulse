'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Report } from '@/types/report';

interface IncidentOption {
  id: string;
  mergedSummary: string;
  leadDepartment: string;
  priorityScore: number;
  reportCount: number;
}

const REJECT_PRESET_REASONS = [
  'Spam or nonsensical text (gibberish)',
  'Image does not depict a municipal issue (photo-text mismatch)',
  'Reused/duplicate image hash detected across reports',
  'Reported location is outside Mysuru City Corporation service limits',
  'Lack of actionable civic information',
];

export default function ReviewQueuePage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [incidents, setIncidents] = useState<IncidentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-report UI states for merge & reject actions
  const [mergeTargetMap, setMergeTargetMap] = useState<Record<string, string>>({});
  const [rejectReasonMap, setRejectReasonMap] = useState<Record<string, string>>({});
  const [activeRejectModalReportId, setActiveRejectModalReportId] = useState<string | null>(null);
  const [customRejectReason, setCustomRejectReason] = useState<string>('');

  // Track action outcome & mocked notifications
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [recentNotification, setRecentNotification] = useState<string | null>(null);
  const [actionHistory, setActionHistory] = useState<
    Array<{ reportId: string; action: string; note: string; timestamp: string }>
  >([]);

  const fetchQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/review-queue');
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load review queue');
      }

      setReports(data.reports || []);
      setIncidents(data.incidents || []);

      // Default first incident selection for merge dropdown
      if (data.incidents && data.incidents.length > 0) {
        const defaultIncId = data.incidents[0].id;
        const initialMergeMap: Record<string, string> = {};
        for (const r of data.reports || []) {
          initialMergeMap[r.id] = defaultIncId;
        }
        setMergeTargetMap(initialMergeMap);
      }
    } catch (err) {
      console.error('Review queue fetch error:', err);
      setError(err instanceof Error ? err.message : 'Error loading review queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleAction = async (
    reportId: string,
    action: 'approve' | 'merge' | 'reject',
    targetIncidentId?: string,
    rejectReason?: string
  ) => {
    setProcessingId(reportId);
    setRecentNotification(null);

    try {
      const res = await fetch('/api/admin/review-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          action,
          targetIncidentId,
          rejectReason,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Review action failed');
        return;
      }

      if (data.mockedNotification) {
        setRecentNotification(data.mockedNotification);
      }

      // Add to session action audit log
      setActionHistory((prev) => [
        {
          reportId,
          action: action.toUpperCase(),
          note:
            action === 'reject'
              ? `Reason: ${rejectReason}`
              : action === 'merge'
              ? `Merged into ${targetIncidentId}`
              : 'Approved and cleared for dispatch',
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
        ...prev,
      ]);

      // Remove the processed report from the active review queue list
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      setActiveRejectModalReportId(null);
      setCustomRejectReason('');
    } catch (err) {
      console.error('Failed to execute review action:', err);
      alert('Network error executing review action');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-16 text-left">
      {/* 1. Header Navigation & Honesty Notice */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <span>←</span>
            <span>Back to Operations Map</span>
          </Link>
          <span className="text-slate-300">|</span>
          <span className="text-xs font-bold text-slate-900">
            🛡️ Human Review Queue ({reports.length})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-900 border border-blue-200">
            ⚖️ Policy: High Suspicion Never Auto-Rejects
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
            🧪 Synthetic Reports
          </span>
        </div>
      </div>

      {/* Mocked Notification Banner */}
      {recentNotification && (
        <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl text-xs text-emerald-900 flex items-start justify-between gap-3 animate-fade-in shadow-xs">
          <div className="flex items-start gap-2.5">
            <span className="text-base leading-none">📱</span>
            <div>
              <div className="font-bold uppercase tracking-wider text-[10px] text-emerald-700">
                Mocked Citizen Notification Dispatched
              </div>
              <div className="font-mono text-emerald-950 mt-0.5 font-medium">
                {recentNotification}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRecentNotification(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold text-sm leading-none"
          >
            ✕
          </button>
        </div>
      )}

      {/* Review Queue Explanation Hero */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-900">
            Suspicious & Low-Confidence Complaint Triage
          </h1>
          <button
            type="button"
            onClick={fetchQueue}
            className="text-xs font-semibold px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          The AI engine analyzes citizen reports for authenticity and clarity. Reports with{' '}
          <span className="font-bold text-amber-800">suspicion score &ge; 60</span> or{' '}
          <span className="font-bold text-slate-800">confidence &lt; 0.50</span> are never discarded
          automatically; they are held here for human operators to evaluate, link to ongoing incidents, or
          dismiss with a logged justification.
        </p>
      </div>

      {/* Loading & Empty State */}
      {loading ? (
        <div className="space-y-3">
          <div className="h-40 bg-slate-200 animate-pulse rounded-3xl" />
          <div className="h-40 bg-slate-200 animate-pulse rounded-3xl" />
        </div>
      ) : error ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-2">
          <div className="text-2xl">⚠️</div>
          <div className="text-sm font-bold text-slate-800">Could Not Load Review Queue</div>
          <p className="text-xs text-slate-500">{error}</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3">
          <div className="text-3xl">🎉</div>
          <div className="text-base font-bold text-slate-900">Review Queue is Clear!</div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            All flagged reports have been reviewed, merged, or dismissed. New suspicious submissions will appear here.
          </p>
          <Link
            href="/admin"
            className="inline-block mt-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
          >
            ← Return to Incident Dashboard
          </Link>
        </div>
      ) : (
        /* Report Cards List */
        <div className="space-y-4">
          {reports.map((report) => {
            const isProcessing = processingId === report.id;
            const fakeReasons = (report as any).fakeReasons || [];
            const isSuspicious = report.fakeScore >= 60;
            const isLowConfidence = (report.confidence ?? 1) < 0.50;

            return (
              <div
                key={report.id}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-sm text-slate-900">{report.id}</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {report.category.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(report.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Suspicion Score Badges */}
                  <div className="flex items-center gap-2">
                    {isSuspicious && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-100 text-red-800 border border-red-300">
                        Suspicion: {report.fakeScore}/100
                      </span>
                    )}
                    {isLowConfidence && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        Confidence: {Math.round((report.confidence ?? 0.4) * 100)}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Reason flags */}
                {fakeReasons.length > 0 && (
                  <div className="bg-red-50/70 p-3 rounded-2xl border border-red-200/80 space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-red-800 flex items-center gap-1">
                      <span>🚩 Flagged Suspicion Signals</span>
                      <span className="font-normal text-red-600">(Requires human judgment)</span>
                    </div>
                    <ul className="list-disc list-inside text-xs text-red-950 font-medium space-y-0.5">
                      {fakeReasons.map((reason: string, rIdx: number) => (
                        <li key={rIdx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Report Content Body: Photo + Text */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {/* Photo if available */}
                  <div className="sm:col-span-1">
                    {(report.imageUrl || (report as any).photoUrl) ? (
                      <div className="relative rounded-2xl overflow-hidden border border-slate-200 aspect-square bg-slate-100 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={report.imageUrl || (report as any).photoUrl}
                          alt="Citizen submission"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 aspect-square bg-slate-50 flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                        <span className="text-xl">📷</span>
                        <span className="text-[10px] mt-1">No photo attached</span>
                      </div>
                    )}
                  </div>

                  {/* Text details */}
                  <div className="sm:col-span-3 space-y-2">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Citizen Submission
                      </div>
                      <p className="text-xs text-slate-800 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 mt-1">
                        &quot;{report.text}&quot;
                      </p>
                    </div>

                    {report.language !== 'en' && report.translatedText && (
                      <div>
                        <div className="text-[10px] uppercase font-bold text-blue-700 tracking-wider flex items-center gap-1">
                          <span>English Translation</span>
                          <span className="text-slate-400">({report.language.toUpperCase()})</span>
                        </div>
                        <p className="text-xs text-slate-700 font-medium bg-blue-50/60 p-2.5 rounded-xl border border-blue-200/60 mt-1">
                          {report.translatedText}
                        </p>
                      </div>
                    )}

                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span>📍</span>
                      <span className="truncate">
                        {(report as any).address || `${report.location.lat.toFixed(4)}, ${report.location.lng.toFixed(4)}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Action Controls Bar ── */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 pt-3">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Operator Triage Actions
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    {/* 1. Approve Button */}
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleAction(report.id, 'approve')}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <span>✓</span>
                      <span>Approve as Genuine</span>
                    </button>

                    {/* 2. Merge into Existing Incident */}
                    <div className="flex items-center gap-1.5">
                      <select
                        disabled={isProcessing || incidents.length === 0}
                        value={mergeTargetMap[report.id] || ''}
                        onChange={(e) =>
                          setMergeTargetMap((prev) => ({ ...prev, [report.id]: e.target.value }))
                        }
                        className="grow text-xs px-2.5 py-2 bg-white rounded-xl border border-slate-300 text-slate-800 focus:outline-hidden"
                      >
                        {incidents.map((inc) => (
                          <option key={inc.id} value={inc.id}>
                            {inc.id} ({inc.leadDepartment})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={isProcessing || incidents.length === 0}
                        onClick={() =>
                          handleAction(
                            report.id,
                            'merge',
                            mergeTargetMap[report.id] || (incidents[0] && incidents[0].id)
                          )
                        }
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-colors disabled:opacity-50 shrink-0 shadow-xs"
                      >
                        Merge
                      </button>
                    </div>

                    {/* 3. Reject with Reason */}
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => {
                        setActiveRejectModalReportId(report.id);
                        setRejectReasonMap((prev) => ({
                          ...prev,
                          [report.id]: prev[report.id] || REJECT_PRESET_REASONS[0],
                        }));
                      }}
                      className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <span>✕</span>
                      <span>Dismiss with Reason</span>
                    </button>
                  </div>

                  {/* Inline Rejection Sub-panel when active */}
                  {activeRejectModalReportId === report.id && (
                    <div className="bg-white p-3.5 rounded-xl border border-rose-200 space-y-2.5 mt-2 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-900">
                          Select Justification for Dismissal (Logged & Notified)
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveRejectModalReportId(null)}
                          className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                        >
                          Cancel
                        </button>
                      </div>

                      <select
                        value={rejectReasonMap[report.id] || REJECT_PRESET_REASONS[0]}
                        onChange={(e) =>
                          setRejectReasonMap((prev) => ({ ...prev, [report.id]: e.target.value }))
                        }
                        className="w-full text-xs px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 text-slate-800 focus:outline-hidden"
                      >
                        {REJECT_PRESET_REASONS.map((reason) => (
                          <option key={reason} value={reason}>
                            {reason}
                          </option>
                        ))}
                        <option value="custom">Other / Custom explanation...</option>
                      </select>

                      {rejectReasonMap[report.id] === 'custom' && (
                        <input
                          type="text"
                          placeholder="Enter specific municipal reason..."
                          value={customRejectReason}
                          onChange={(e) => setCustomRejectReason(e.target.value)}
                          className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-slate-300 text-slate-800 placeholder-slate-400 focus:outline-hidden"
                        />
                      )}

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setActiveRejectModalReportId(null)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => {
                            const reason =
                              rejectReasonMap[report.id] === 'custom'
                                ? customRejectReason.trim() || 'Custom operator dismissal'
                                : rejectReasonMap[report.id] || REJECT_PRESET_REASONS[0];
                            handleAction(report.id, 'reject', undefined, reason);
                          }}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white shadow-2xs transition-colors"
                        >
                          Confirm Dismissal
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Session Audit Log */}
      {actionHistory.length > 0 && (
        <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200 space-y-2">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Review Session Log ({actionHistory.length} actions)
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {actionHistory.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-slate-200"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900">{item.reportId}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      item.action === 'APPROVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.action === 'MERGE'
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {item.action}
                  </span>
                  <span className="text-slate-600 text-xs">{item.note}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{item.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
