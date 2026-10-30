import seedReportsData from '@/data/seedReports.json';
import { linkReportToIncident } from '@/lib/ai/incidentLinking';
import type { Incident } from '@/types/incident';
import type { Report } from '@/types/report';

let fallbackIncidentsCache: Incident[] | null = null;
let fallbackReportsMapCache: Map<string, Report> | null = null;

/**
 * Initializes and returns linked incidents and reports from seed data.
 * Used for fallback when live Firestore is empty or unconfigured.
 */
export function getFallbackIncidentsAndReports(): {
  incidents: Incident[];
  reportsMap: Map<string, Report>;
} {
  if (fallbackIncidentsCache && fallbackReportsMapCache) {
    return {
      incidents: fallbackIncidentsCache,
      reportsMap: fallbackReportsMapCache,
    };
  }

  const incidents: Incident[] = [];
  const reportsMap = new Map<string, Report>();

  for (const raw of seedReportsData as any[]) {
    const report: Report = {
      ...raw,
      location: { lat: raw.lat, lng: raw.lng },
      translatedText: raw.translatedText || raw.text,
      department: raw.department,
      aiResult: {
        language: raw.language,
        translatedText: raw.translatedText || raw.text,
        category: raw.category,
        summary: raw.summary || raw.text.slice(0, 80),
        imageFindings: raw.imageFindings,
        severityCues: raw.severityCues || [],
        department: raw.department,
        confidence: raw.confidence,
        textImageMismatch: raw.textImageMismatch || false,
      },
      fakeSignals: {
        textImageMismatch: raw.textImageMismatch || false,
        noSceneInImage: (raw.fakeReasons || []).some((r: string) => r.toLowerCase().includes('no scene')),
        rapidRepeatSubmission: (raw.fakeReasons || []).some((r: string) => r.toLowerCase().includes('rapid')),
        gibberishText: (raw.fakeReasons || []).some((r: string) => r.toLowerCase().includes('gibberish')),
        outOfServiceArea: (raw.fakeReasons || []).some((r: string) => r.toLowerCase().includes('service area')),
        reusedImageHash: (raw.fakeReasons || []).some((r: string) => r.toLowerCase().includes('image hash')),
      },
    };
    reportsMap.set(report.id, report);
  }

  for (const report of reportsMap.values()) {
    const { incident, isNewIncident } = linkReportToIncident(report, incidents, reportsMap);
    if (isNewIncident) {
      incidents.push(incident);
    } else {
      const idx = incidents.findIndex((i) => i.id === incident.id);
      if (idx !== -1) incidents[idx] = incident;
    }
  }

  fallbackIncidentsCache = incidents.sort((a, b) => b.priorityScore - a.priorityScore);
  fallbackReportsMapCache = reportsMap;

  return { incidents: fallbackIncidentsCache, reportsMap: fallbackReportsMapCache };
}

/** Update in-memory fallback state during demo actions */
export function updateFallbackIncident(id: string, updates: Partial<Incident>) {
  if (!fallbackIncidentsCache) getFallbackIncidentsAndReports();
  const inc = fallbackIncidentsCache?.find((i) => i.id === id);
  if (inc) {
    Object.assign(inc, updates);
  }
}

export function updateFallbackReport(id: string, updates: Partial<Report>) {
  if (!fallbackReportsMapCache) getFallbackIncidentsAndReports();
  const rep = fallbackReportsMapCache?.get(id);
  if (rep) {
    Object.assign(rep, updates);
  }
}

