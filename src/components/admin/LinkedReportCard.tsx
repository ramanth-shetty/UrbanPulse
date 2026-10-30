import React from 'react';
import type { Report } from '@/types/report';

interface LinkedReportCardProps {
  report: Report;
}

export default function LinkedReportCard({ report }: LinkedReportCardProps) {
  const isNonEnglish = report.language && report.language !== 'en' && report.language !== 'unknown';
  const hasFakeFlags = report.fakeScore > 0;
  const isSuspicious = report.fakeScore >= 60;

  return (
    <div className="bg-white rounded-md p-4 border border-slate-200 shadow-2xs space-y-3 text-left">
      {/* Header: ID, Badges */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-sm">
            {report.id}
          </span>
          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700">
            {report.category.replace('_', ' ')}
          </span>
          {report.synthetic && (
            <span className="text-[9px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded-sm border border-amber-200">
              Synthetic
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Fallback Mode Badge */}
          {report.fallbackMode && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-amber-100 text-amber-900 border border-amber-300">
              Fallback Mode
            </span>
          )}

          {/* AI Confidence */}
          {report.confidence > 0 && !report.fallbackMode && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700 border border-slate-200 font-mono">
              {(report.confidence * 100).toFixed(0)}% Conf
            </span>
          )}

          {/* Fake Score Indicator */}
          {hasFakeFlags && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-sm border ${
                isSuspicious
                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              Fake Score: {report.fakeScore}
            </span>
          )}
        </div>
      </div>

      {/* Main Content & Photo Layout */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Photo Thumbnail if available */}
        {report.imageUrl && (
          <div className="sm:w-32 sm:h-24 h-36 w-full rounded-md overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
            <img
              src={report.imageUrl}
              alt="Citizen report visual evidence"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        <div className="flex-1 space-y-1.5 min-w-0">
          {/* Original Complaint Text */}
          <div className="text-xs text-slate-800 leading-relaxed font-medium">
            "{report.text}"
          </div>

          {/* Translated Text if non-English */}
          {isNonEnglish && report.translatedText && (
            <div className="p-2 rounded-md bg-slate-50 border border-slate-100 text-[11px] text-slate-600 italic">
              <span className="font-semibold not-italic text-slate-500 uppercase text-[9px] mr-1">
                Translated ({report.language}):
              </span>
              "{report.translatedText}"
            </div>
          )}

          {/* AI Image Findings */}
          {report.aiResult?.imageFindings && (
            <div className="text-[11px] text-slate-500 flex items-start gap-1">
              <span className="font-semibold text-slate-600 shrink-0">Visual Findings:</span>
              <span className="line-clamp-2">{report.aiResult.imageFindings}</span>
            </div>
          )}
        </div>
      </div>

      {/* Fake Suspicion Reasons list */}
      {report.fakeReasons && report.fakeReasons.length > 0 && (
        <div className="bg-rose-50 p-2.5 rounded-md border border-rose-200 space-y-1">
          <div className="text-[10px] uppercase font-bold text-rose-900 tracking-wider">
            Suspicion Reasons (Routed to Review Queue — Never Auto-Rejected)
          </div>
          <ul className="text-[11px] text-rose-800 space-y-0.5">
            {report.fakeReasons.map((reason, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block shrink-0" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer info: Coordinates, Timestamp */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
        <span className="font-mono">
          {report.location.lat.toFixed(4)}, {report.location.lng.toFixed(4)}
        </span>
        <span>
          Logged: {new Date(report.createdAt).toLocaleDateString()} {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

