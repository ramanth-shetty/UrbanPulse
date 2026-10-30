import { db } from '../lib/firebase';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import type { Report } from '../types/report';
import type { Incident } from '../types/incident';
import type { AIAnalysis, FakeSignals, PriorityFactors } from '../types/ai';
import type { Department } from '../types/department';
import type { StatusHistoryEntry } from '../types/status';
import seedData from '../data/seedReports.json';

// ── Types for the compact seed JSON format ───────────────────────────

interface SeedInput {
  id: string;
  text: string;
  category: string;
  lat: number;
  lng: number;
  imageUrl: string | null;
  language: 'en' | 'kn' | 'hi' | 'unknown';
  translatedText: string;
  summary: string;
  department: Department;
  confidence: number;
  severityCues: string[];
  imageFindings: string | null;
  textImageMismatch: boolean;
  fakeScore: number;
  fakeReasons: string[];
  createdAt: string;
  group: string | null;
  nearSensitive: boolean;
  safetyOverride: string | null;
  imageHash: string | null;
}

// ── Duplicate groups → Incident definitions ──────────────────────────
// Each group creates one incident. Reports outside any group get their own.

interface IncidentDef {
  id: string;
  group: string;
  mergedSummary: string;
  rootCauseGuess: string | null;
  leadDepartment: Department;
  supportingDepartments: Department[];
  priorityScore: number;
  priorityFactors: PriorityFactors;
}

const INCIDENT_DEFS: IncidentDef[] = [
  {
    id: 'INC-001',
    group: 'sayyaji-rao-cluster',
    mergedSummary:
      'Persistent drain blockage on Sayyaji Rao Road near the clock tower causing waterlogging and road surface damage. Multiple citizens report overflow, foul smell, traffic disruption, and vehicle accidents. Cross-category issue spanning drainage and road infrastructure.',
    rootCauseGuess:
      'Blocked main storm drain under Sayyaji Rao Road, likely due to accumulated solid waste and construction debris, causing upstream waterlogging and downstream road deterioration.',
    leadDepartment: 'water_drainage',
    supportingDepartments: ['roads'],
    priorityScore: 82,
    priorityFactors: {
      safetyRisk: 0.5,
      peopleAffected: 0.9,
      imageSeverity: 0.6,
      age: 0.5,
      sensitiveLocation: 0.0,
      recurrenceHistory: 0.7,
    },
  },
  {
    id: 'INC-002',
    group: 'kuvempunagar-garbage',
    mergedSummary:
      'Recurring garbage accumulation at Kuvempunagar 2nd stage junction. Not collected for multiple days. Stray dogs, bad smell, and footpath blockage reported.',
    rootCauseGuess:
      'Missed garbage collection schedule for Kuvempunagar 2nd stage area. Possible vehicle breakdown or route skip.',
    leadDepartment: 'sanitation',
    supportingDepartments: [],
    priorityScore: 55,
    priorityFactors: {
      safetyRisk: 0.2,
      peopleAffected: 0.5,
      imageSeverity: 0.4,
      age: 0.6,
      sensitiveLocation: 0.0,
      recurrenceHistory: 0.4,
    },
  },
  {
    id: 'INC-003',
    group: 'gokulam-pothole',
    mergedSummary:
      'Cluster of deep potholes on Gokulam 3rd Main Road near the circle. Vehicle damage, elderly injury, and multiple accidents reported.',
    rootCauseGuess:
      'Road surface failure from water seepage and heavy traffic. Likely needs full resurfacing rather than patching.',
    leadDepartment: 'roads',
    supportingDepartments: [],
    priorityScore: 58,
    priorityFactors: {
      safetyRisk: 0.5,
      peopleAffected: 0.5,
      imageSeverity: 0.5,
      age: 0.4,
      sensitiveLocation: 0.0,
      recurrenceHistory: 0.5,
    },
  },
  {
    id: 'INC-004',
    group: 'vijayanagar-streetlight',
    mergedSummary:
      'Complete streetlight outage on Vijayanagar 1st stage main road for over a week. Women and children feel unsafe. Reports of increased theft.',
    rootCauseGuess:
      'Possible cable fault or transformer issue affecting the entire stretch. Not individual bulb failures.',
    leadDepartment: 'electricity',
    supportingDepartments: [],
    priorityScore: 48,
    priorityFactors: {
      safetyRisk: 0.4,
      peopleAffected: 0.4,
      imageSeverity: 0.3,
      age: 0.5,
      sensitiveLocation: 0.0,
      recurrenceHistory: 0.3,
    },
  },
  {
    id: 'INC-005',
    group: 'kr-hospital-manhole',
    mergedSummary:
      'Open manhole without any barriers or warning signs directly outside KR Hospital main entrance. Extreme fall hazard for patients, visitors, and emergency vehicles.',
    rootCauseGuess:
      'Manhole cover stolen or displaced. Requires immediate temporary barricading and permanent cover replacement.',
    leadDepartment: 'roads',
    supportingDepartments: [],
    priorityScore: 95,
    priorityFactors: {
      safetyRisk: 1.0,
      peopleAffected: 0.4,
      imageSeverity: 0.8,
      age: 0.2,
      sensitiveLocation: 1.0,
      recurrenceHistory: 0.3,
    },
  },
  {
    id: 'INC-006',
    group: 'jayalakshmipuram-park',
    mergedSummary:
      'Park in Jayalakshmipuram near 2nd Cross completely overgrown with waist-high grass. Snake sightings reported. Children cannot use the park.',
    rootCauseGuess: 'Skipped maintenance cycle for this park. Needs full clearing and regular mowing schedule.',
    leadDepartment: 'parks',
    supportingDepartments: [],
    priorityScore: 35,
    priorityFactors: {
      safetyRisk: 0.3,
      peopleAffected: 0.3,
      imageSeverity: 0.2,
      age: 0.3,
      sensitiveLocation: 0.0,
      recurrenceHistory: 0.2,
    },
  },
  {
    id: 'INC-007',
    group: 'lakshmipuram-traffic',
    mergedSummary:
      'Traffic signal at Lakshmipuram circle non-functional for 2+ days. Rush hour chaos and near-miss accidents reported.',
    rootCauseGuess: 'Signal controller failure or power supply issue at the junction.',
    leadDepartment: 'traffic',
    supportingDepartments: [],
    priorityScore: 62,
    priorityFactors: {
      safetyRisk: 0.6,
      peopleAffected: 0.6,
      imageSeverity: 0.3,
      age: 0.5,
      sensitiveLocation: 0.0,
      recurrenceHistory: 0.4,
    },
  },
  {
    id: 'INC-008',
    group: 'school-garbage',
    mergedSummary:
      'Garbage dump directly adjacent to Demonstration School main gate in Saraswathipuram. Children forced to walk through waste. Health hazard and foul smell.',
    rootCauseGuess: 'Unauthorized dumping spot near the school. Needs clearance and anti-dumping measures.',
    leadDepartment: 'sanitation',
    supportingDepartments: [],
    priorityScore: 68,
    priorityFactors: {
      safetyRisk: 0.3,
      peopleAffected: 0.5,
      imageSeverity: 0.4,
      age: 0.4,
      sensitiveLocation: 1.0,
      recurrenceHistory: 0.3,
    },
  },
  {
    id: 'INC-009',
    group: 'jss-hospital-waterlogging',
    mergedSummary:
      'Severe waterlogging near JSS Hospital entrance on Ramanuja Road. Patients in wheelchairs and ambulances unable to access the hospital. Drain overflow.',
    rootCauseGuess: 'Blocked drain near hospital entrance combined with low-lying road grade.',
    leadDepartment: 'water_drainage',
    supportingDepartments: [],
    priorityScore: 78,
    priorityFactors: {
      safetyRisk: 0.5,
      peopleAffected: 0.6,
      imageSeverity: 0.6,
      age: 0.3,
      sensitiveLocation: 1.0,
      recurrenceHistory: 0.4,
    },
  },
];

// ── Helper: build a full Report from compact seed input ──────────────

function hydrateReport(input: SeedInput, incidentId: string): Report {
  const now = input.createdAt;

  // Build the fake signals from the score and reasons.
  const fakeSignals: FakeSignals = {
    textImageMismatch: input.textImageMismatch,
    noSceneInImage: input.fakeReasons.some((r) => r.toLowerCase().includes('no scene')),
    rapidRepeatSubmission: input.fakeReasons.some((r) => r.toLowerCase().includes('rapid')),
    gibberishText: input.fakeReasons.some((r) => r.toLowerCase().includes('gibberish')),
    outOfServiceArea: input.fakeReasons.some((r) => r.toLowerCase().includes('service area')),
    reusedImageHash: input.fakeReasons.some((r) => r.toLowerCase().includes('image hash')),
  };

  // Build cached AI analysis (pre-computed, so the demo never needs live API).
  const aiResult: AIAnalysis = {
    language: input.language,
    translatedText: input.translatedText,
    category: input.category,
    summary: input.summary,
    imageFindings: input.imageFindings,
    severityCues: input.severityCues,
    department: input.department,
    confidence: input.confidence,
    textImageMismatch: input.textImageMismatch,
  };

  const initialStatus: StatusHistoryEntry = {
    status: 'new',
    timestamp: now,
    actor: 'system',
    note: 'Report submitted (synthetic seed data)',
  };

  return {
    id: input.id,
    text: input.text,
    category: input.category,
    location: { lat: input.lat, lng: input.lng },
    imageUrl: input.imageUrl,
    aiResult,
    fallbackMode: false,
    language: input.language,
    translatedText: input.translatedText,
    department: input.department,
    confidence: input.confidence,
    fakeScore: input.fakeScore,
    fakeSignals,
    fakeReasons: input.fakeReasons,
    imageHash: input.imageHash,
    incidentId,
    status: 'new',
    statusHistory: [initialStatus],
    createdAt: now,
    updatedAt: now,
    synthetic: true,
  };
}

// ── Helper: build an Incident from its definition + member reports ───

function buildIncident(
  def: IncidentDef,
  memberReports: Report[],
): Incident {
  // Centroid of all member report locations.
  const avgLat = memberReports.reduce((s, r) => s + r.location.lat, 0) / memberReports.length;
  const avgLng = memberReports.reduce((s, r) => s + r.location.lng, 0) / memberReports.length;

  // Earliest report timestamp is the incident creation time.
  const earliest = memberReports
    .map((r) => r.createdAt)
    .sort()[0];

  const latest = memberReports
    .map((r) => r.updatedAt)
    .sort()
    .reverse()[0];

  const initialStatus: StatusHistoryEntry = {
    status: 'new',
    timestamp: earliest,
    actor: 'system',
    note: 'Incident created from clustered reports (synthetic seed data)',
  };

  return {
    id: def.id,
    memberReportIds: memberReports.map((r) => r.id),
    reportCount: memberReports.length,
    mergedSummary: def.mergedSummary,
    rootCauseGuess: def.rootCauseGuess,
    priorityScore: def.priorityScore,
    priorityFactors: def.priorityFactors,
    leadDepartment: def.leadDepartment,
    supportingDepartments: def.supportingDepartments,
    location: { lat: avgLat, lng: avgLng },
    status: 'new',
    statusHistory: [initialStatus],
    verificationStatus: null,
    closureUnreliable: false,
    createdAt: earliest,
    updatedAt: latest,
    synthetic: true,
  };
}

// ── Helper: build a standalone incident for a single report ──────────

function buildStandaloneIncident(
  report: Report,
  index: number,
): Incident {
  // Standalone incidents get IDs starting after the group incidents.
  const incId = `INC-${String(index).padStart(3, '0')}`;

  /**
   * Simple deterministic priority for standalones.
   * Uses the report's own severity cues and metadata.
   * Weights: safety 0.30, people 0.20, image 0.15, age 0.10, sensitive 0.15, recurrence 0.10
   */
  const safetyRisk = report.fakeScore < 50
    ? (report.aiResult?.severityCues.length ?? 0) >= 3 ? 0.7 : 0.3
    : 0.1;
  const nearSensitive = (seedData as SeedInput[]).find((s) => s.id === report.id)?.nearSensitive
    ? 1.0
    : 0.0;
  const hasSafetyOverride = (seedData as SeedInput[]).find((s) => s.id === report.id)?.safetyOverride;
  const adjustedSafety = hasSafetyOverride ? 1.0 : safetyRisk;
  const imageSev = report.imageUrl ? 0.4 : 0.2;

  const factors: PriorityFactors = {
    safetyRisk: adjustedSafety,
    peopleAffected: 0.1, // single report
    imageSeverity: imageSev,
    age: 0.3,
    sensitiveLocation: nearSensitive,
    recurrenceHistory: 0.1,
  };

  const score = Math.round(
    (factors.safetyRisk * 30 +
      factors.peopleAffected * 20 +
      factors.imageSeverity * 15 +
      factors.age * 10 +
      factors.sensitiveLocation * 15 +
      factors.recurrenceHistory * 10) ,
  );

  const initialStatus: StatusHistoryEntry = {
    status: 'new',
    timestamp: report.createdAt,
    actor: 'system',
    note: 'Incident created from single report (synthetic seed data)',
  };

  return {
    id: incId,
    memberReportIds: [report.id],
    reportCount: 1,
    mergedSummary: report.aiResult?.summary ?? report.text,
    rootCauseGuess: null,
    priorityScore: score,
    priorityFactors: factors,
    leadDepartment: report.department!,
    supportingDepartments: [],
    location: report.location,
    status: 'new',
    statusHistory: [initialStatus],
    verificationStatus: null,
    closureUnreliable: false,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
    synthetic: true,
  };
}

// ── Main seed function ───────────────────────────────────────────────

export async function seedDatabase(): Promise<{ reports: number; incidents: number }> {
  const inputs = seedData as SeedInput[];
  const allReports: Report[] = [];
  const allIncidents: Incident[] = [];

  // 1. Group reports by their `group` field.
  const grouped = new Map<string, SeedInput[]>();
  const ungrouped: SeedInput[] = [];

  for (const input of inputs) {
    if (input.group) {
      const arr = grouped.get(input.group) ?? [];
      arr.push(input);
      grouped.set(input.group, arr);
    } else {
      ungrouped.push(input);
    }
  }

  // 2. Build group incidents and their member reports.
  for (const def of INCIDENT_DEFS) {
    const members = grouped.get(def.group);
    if (!members) continue;

    const reports = members.map((m) => hydrateReport(m, def.id));
    allReports.push(...reports);

    const incident = buildIncident(def, reports);
    allIncidents.push(incident);
  }

  // 3. Build standalone incidents for ungrouped reports.
  let standaloneIdx = INCIDENT_DEFS.length + 1; // Start after group incidents
  for (const input of ungrouped) {
    const incId = `INC-${String(standaloneIdx).padStart(3, '0')}`;
    const report = hydrateReport(input, incId);
    allReports.push(report);

    const incident = buildStandaloneIncident(report, standaloneIdx);
    allIncidents.push(incident);
    standaloneIdx++;
  }

  // 4. Write to Firestore in batches (max 500 ops per batch).
  // Reports
  const reportBatches = chunkArray(allReports, 400);
  for (const chunk of reportBatches) {
    const batch = writeBatch(db);
    for (const report of chunk) {
      batch.set(doc(db, 'reports', report.id), report);
    }
    await batch.commit();
  }

  // Incidents
  const incidentBatches = chunkArray(allIncidents, 400);
  for (const chunk of incidentBatches) {
    const batch = writeBatch(db);
    for (const incident of chunk) {
      batch.set(doc(db, 'incidents', incident.id), incident);
    }
    await batch.commit();
  }

  return { reports: allReports.length, incidents: allIncidents.length };
}

/** Split an array into chunks of a given size. */
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

