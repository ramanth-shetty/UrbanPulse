'use client';

import React, { useState } from 'react';
import type { Report } from '@/types/report';

interface ReportSuccessProps {
  report: Report;
  onReset: () => void;
}

export default function ReportSuccess({ report, onReset }: ReportSuccessProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(report.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-md p-6 border border-slate-200 text-left space-y-4 max-w-2xl mx-auto">
      <div className="border-b border-slate-200 pb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900">Complaint Registered</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Your report has been queued for municipal dispatch.
          </p>
        </div>
        <span className="font-mono text-xs font-bold uppercase px-2.5 py-1 rounded bg-slate-100 text-slate-800 border border-slate-200">
          Status: {report.status}
        </span>
      </div>

      {/* Ticket ID Box */}
      <div className="bg-slate-50 p-4 rounded-md border border-slate-200 space-y-2">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Tracking Identifier
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xl font-mono font-bold tracking-wider text-slate-900">
            {report.id}
          </span>
          <button
            type="button"
            onClick={handleCopyId}
            className="px-2.5 py-1 text-xs rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition-colors"
          >
            {copied ? 'Copied' : 'Copy ID'}
          </button>
        </div>
        <div className="text-[11px] text-slate-500">
          Retain this ID to track municipal field resolution and verify completion.
        </div>
      </div>

      {/* Summary details */}
      <div className="text-xs bg-slate-50 p-4 rounded-md border border-slate-200 space-y-2 text-slate-700">
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Category:</span>
          <span className="font-semibold text-slate-900 uppercase">
            {report.category.replace('_', ' ')}
          </span>
        </div>

        {report.aiResult && (
          <div className="pt-2 border-t border-slate-200 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Intake Assessment
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                {report.fallbackMode ? 'Rule-based Assessment' : `Gemini Analyzed (${Math.round(report.aiResult.confidence * 100)}%)`}
              </span>
            </div>

            <p className="text-xs text-slate-900 font-medium">
              {report.aiResult.summary}
            </p>

            {report.aiResult.language !== 'en' && report.aiResult.language !== 'unknown' && (
              <div className="text-[11px] text-slate-500 italic">
                Translation ({report.aiResult.language.toUpperCase()}): &quot;{report.aiResult.translatedText}&quot;
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="px-2 py-0.5 bg-white text-slate-700 rounded text-[10px] font-medium border border-slate-200 uppercase">
                Department: {report.aiResult.department.replace('_', ' ')}
              </span>
              {report.aiResult.severityCues.map((cue, i) => (
                <span key={i} className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-[10px] font-medium border border-red-200 uppercase">
                  Cue: {cue}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between pt-2 border-t border-slate-200">
          <span className="text-slate-500">Coordinates:</span>
          <span className="font-mono text-slate-900">
            {report.location.lat.toFixed(4)}, {report.location.lng.toFixed(4)}
          </span>
        </div>
      </div>

      <div className="pt-2 flex flex-col sm:flex-row gap-2">
        <a
          href={`/track/${report.id}`}
          className="flex-1 text-center bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-4 rounded-md transition-colors text-xs"
        >
          Track Issue Progress &rarr;
        </a>

        <button
          type="button"
          onClick={onReset}
          className="py-2.5 px-4 text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-300 rounded-md bg-white hover:bg-slate-50 transition-colors"
        >
          Submit Another Report
        </button>
      </div>
    </div>
  );
}
