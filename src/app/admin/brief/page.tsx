'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ALL_DEPARTMENTS, DEPARTMENT_LABELS, type Department } from '@/types/department';
import type { MorningBrief } from '@/lib/ai/morningBrief';

const DEPT_ICONS: Record<Department, string> = {
  water_drainage: '💧',
  roads: '🚧',
  sanitation: '🗑️',
  electricity: '⚡',
  parks: '🌳',
  traffic: '🚦',
};

export default function MorningBriefPage() {
  const [selectedDept, setSelectedDept] = useState<Department>('roads');
  const [briefData, setBriefData] = useState<MorningBrief | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBrief = async (dept: Department, forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const url = `/api/admin/morning-brief?department=${dept}${forceRefresh ? '&refresh=true' : ''}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate morning brief');
      }

      setBriefData(data.brief);
      setIsCached(!!data.cached);
    } catch (err) {
      console.error('Error loading morning brief:', err);
      setError(err instanceof Error ? err.message : 'Error generating morning brief');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBrief(selectedDept, false);
  }, [selectedDept]);

  const handlePrint = () => {
    window.print();
  };

  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 text-left">
      {/* ── 1. Top Controls Bar (Hidden in Print) ── */}
      <div className="print:hidden space-y-4">
        {/* Navigation & Header */}
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
              📋 Morning Dispatch Brief
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
              🧪 Simulated Routing & Crews
            </span>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-transform active:scale-[0.98]"
            >
              <span>🖨️</span>
              <span>Print / Save as PDF</span>
            </button>
          </div>
        </div>

        {/* Department Tab Selectors */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {ALL_DEPARTMENTS.map((dept) => {
            const active = selectedDept === dept;
            return (
              <button
                key={dept}
                type="button"
                onClick={() => setSelectedDept(dept)}
                className={`text-xs font-bold px-3 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 border ${
                  active
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{DEPT_ICONS[dept]}</span>
                <span>{DEPARTMENT_LABELS[dept]}</span>
              </button>
            );
          })}
        </div>

        {/* Status / Generation Meta Bar */}
        <div className="flex items-center justify-between text-xs bg-slate-100/80 px-4 py-2 rounded-xl text-slate-600">
          <div className="flex items-center gap-2">
            {briefData?.aiGenerated ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                ✨ Gemini 1.5 AI Narrated
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                ⚠️ Template Fallback Mode
              </span>
            )}
            {isCached && (
              <span className="text-[10px] font-medium text-slate-500">
                ⚡ Cached Dispatch Brief
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={refreshing || loading}
            onClick={() => fetchBrief(selectedDept, true)}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 disabled:opacity-50"
          >
            {refreshing ? 'Regenerating...' : '↻ Regenerate Brief'}
          </button>
        </div>
      </div>

      {/* ── 2. Official Printable Morning Briefing Document ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0 space-y-6 text-slate-900 print:text-black">
        {/* Printable Official Letterhead Header */}
        <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-slate-900 text-white font-black flex items-center justify-center text-sm print:border print:border-black">
                M
              </span>
              <span className="font-mono uppercase font-black tracking-wider text-xs text-slate-700">
                Mysuru City Corporation (MCC) • Operations Command
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Daily Morning Dispatch Briefing
            </h1>
            <div className="text-xs font-medium text-slate-500 font-mono">
              Department: <span className="font-bold text-slate-900 uppercase">{DEPARTMENT_LABELS[selectedDept]}</span> • Date: {todayFormatted}
            </div>
          </div>

          <div className="text-right sm:self-end">
            <div className="inline-block px-3 py-1 rounded-xl bg-slate-100 font-mono text-[11px] font-bold text-slate-800 border border-slate-200">
              Shift: 07:00 - 15:00 IST
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Top 3 Priority Incidents
            </div>
          </div>
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div className="space-y-4 py-8">
            <div className="h-6 w-3/4 bg-slate-200 animate-pulse rounded-lg" />
            <div className="h-28 bg-slate-100 animate-pulse rounded-2xl" />
            <div className="h-32 bg-slate-100 animate-pulse rounded-2xl" />
          </div>
        ) : error || !briefData ? (
          <div className="p-8 text-center space-y-3 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="text-2xl">⚠️</div>
            <div className="font-bold text-sm text-slate-800">Could Not Load Morning Brief</div>
            <p className="text-xs text-slate-500">{error || 'Unknown briefing error.'}</p>
          </div>
        ) : (
          <>
            {/* Executive Headline Callout */}
            <div className="bg-blue-50/80 p-4 rounded-2xl border border-blue-200 text-blue-950 font-bold text-sm sm:text-base leading-snug print:bg-white print:border-slate-400">
              📢 {briefData.brief.executiveHeadline}
            </div>

            {/* ── Section A: What to Fix First ── */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-black text-[11px] flex items-center justify-center">
                  1
                </span>
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  What to Fix First (Immediate Priority #1)
                </h2>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 print:bg-white print:border-slate-300">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {briefData.brief.whatToFixFirst.incidentId}
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      📍 {briefData.brief.whatToFixFirst.targetLocation}
                    </span>
                  </div>
                  {briefData.topIncidents[0] && (
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300">
                      Priority Score: {briefData.topIncidents[0].priorityScore}/100
                    </span>
                  )}
                </div>

                <p className="text-xs font-medium text-slate-800">
                  <span className="font-bold">Issue:</span> {briefData.brief.whatToFixFirst.summary}
                </p>

                <div className="bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200 text-xs text-emerald-950 font-medium print:bg-white print:border-emerald-500">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-800 block mb-0.5">
                    Field Action Directive
                  </span>
                  {briefData.brief.whatToFixFirst.actionRecommendation}
                </div>
              </div>
            </div>

            {/* ── Section B: Why (Deterministic Factors & Justification) ── */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-black text-[11px] flex items-center justify-center">
                  2
                </span>
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Why: Factor-Based Urgency Justification
                </h2>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700 leading-relaxed font-medium print:bg-white print:border-slate-300">
                {briefData.brief.why}
              </div>
            </div>

            {/* ── Section C: Suggested Crew Grouping by Location ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-black text-[11px] flex items-center justify-center">
                    3
                  </span>
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Suggested Crew Grouping by Location
                  </h2>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 print:hidden">
                  (Simulated Crew Entities)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {briefData.brief.suggestedCrewGrouping.map((grp, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5 text-xs print:bg-white print:border-slate-300"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{grp.crewName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {grp.assignedIncidentIds.join(', ')}
                      </span>
                    </div>
                    <div className="text-[11px] text-blue-700 font-medium">
                      📍 Sector: {grp.clusterArea}
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      {grp.rationale}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Section D: Risks If Delayed ── */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-black text-[11px] flex items-center justify-center">
                  4
                </span>
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Critical Risks & Escalations If Delayed
                </h2>
              </div>

              <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200/80 space-y-1.5 print:bg-white print:border-rose-400">
                <ul className="list-disc list-inside text-xs text-rose-950 font-medium space-y-1">
                  {briefData.brief.risks.map((risk, idx) => (
                    <li key={idx}>{risk}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ── Section E: Top 3 Ranked Incident Dossiers (Unmodified Scores) ── */}
            <div className="space-y-3 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Incident Dossiers (Deterministic Priority Ranks)
                  </h3>
                  <div className="text-[10px] text-slate-500">
                    Scores calculated deterministically via weighted factors — un-altered by AI narration
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                {briefData.topIncidents.map((inc, idx) => (
                  <div
                    key={inc.id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2 text-xs print:bg-white print:border-slate-300"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 font-bold text-[10px] flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <Link
                          href={`/admin/incidents/${inc.id}`}
                          className="font-mono font-bold text-slate-900 hover:underline"
                        >
                          {inc.id}
                        </Link>
                        {inc.closureUnreliable && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                            REOPENED (UNRELIABLE)
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {inc.reportCount} report{inc.reportCount > 1 ? 's' : ''}
                        </span>
                      </div>

                      <span
                        className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                          inc.priorityScore >= 80
                            ? 'bg-red-100 text-red-800 border-red-300'
                            : inc.priorityScore >= 60
                            ? 'bg-orange-100 text-orange-800 border-orange-300'
                            : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                        }`}
                      >
                        Priority: {inc.priorityScore}/100
                      </span>
                    </div>

                    <p className="text-slate-800 font-medium leading-relaxed">
                      {inc.mergedSummary}
                    </p>

                    {/* Factor metric chips */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-600 pt-1">
                      <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                        Safety: {Math.round(inc.priorityFactors.safetyRisk * 100)}%
                      </span>
                      <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                        Affected: {Math.round(inc.priorityFactors.peopleAffected * 100)}%
                      </span>
                      {inc.priorityFactors.sensitiveLocation > 0 && (
                        <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-200 font-bold">
                          Near School/Hospital
                        </span>
                      )}
                      <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                        Visual: {Math.round(inc.priorityFactors.imageSeverity * 100)}%
                      </span>
                      <span className="text-slate-400 font-mono ml-auto">
                        ({inc.location.lat.toFixed(4)}, {inc.location.lng.toFixed(4)})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Official Sign-off Footer for Print */}
            <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-[10px] text-slate-500 font-mono">
              <div>
                <div>UrbanPulse Municipal Engine • Mysuru City Corporation</div>
                <div>Generated: {new Date(briefData.generatedAt).toLocaleString('en-IN')}</div>
              </div>
              <div className="text-right">
                <div className="w-36 border-b border-slate-400 mb-1" />
                <div>Chief Ward Officer Sign-off</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Global Print Stylesheet ── */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          header,
          footer,
          nav,
          .print\\:hidden {
            display: none !important;
          }
          main {
            padding: 0 !important;
            max-width: 100% !important;
          }
          @page {
            margin: 1.2cm;
            size: A4 portrait;
          }
        }
      `}</style>
    </div>
  );
}

