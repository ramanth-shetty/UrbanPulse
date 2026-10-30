import type { Department } from '../../types/department.ts';
import type { Incident } from '../../types/incident.ts';
import type { Report, GeoLocation } from '../../types/report.ts';
import type { StatusHistoryEntry } from '../../types/status.ts';
import { calculatePriority } from './priorityScoring.ts';

/**
 * Incident Linking Configuration
 */
export const LINKING_CONFIG = {
  maxDistanceMeters: 150,     // 150m spatial cluster radius
  maxTimeWindowDays: 14,      // 14 days temporal window
  matchThreshold: 0.50,       // Minimum composite score to link into existing incident
  weights: {
    distance: 0.45,           // Spatial proximity
    categoryRelatedness: 0.35,// Cross-category domain linkage
    textSimilarity: 0.20,     // Keyword / semantic overlap
  },
} as const;

/**
 * Maps civic complaint categories to standard department keys.
 */
export const CATEGORY_TO_DEPARTMENT: Record<string, Department> = {
  water_drainage: 'water_drainage',
  road_damage: 'roads',
  roads: 'roads',
  garbage_dump: 'sanitation',
  sanitation: 'sanitation',
  electrical_hazard: 'electricity',
  electricity: 'electricity',
  park_maintenance: 'parks',
  parks: 'parks',
  traffic_issue: 'traffic',
  traffic: 'traffic',
};

/**
 * Category / Department Relatedness Table.
 *
 * Defines which distinct civic domains share common root causes
 * (e.g. clogged drain -> waterlogging -> road surface collapse).
 */
export const CATEGORY_RELATEDNESS: Record<string, Record<string, number>> = {
  water_drainage: {
    water_drainage: 1.0,
    roads: 0.85,          // Drain overflow directly causes road erosion & potholes
    sanitation: 0.75,     // Garbage clogs stormwater drains
    traffic: 0.65,        // Waterlogging floods thoroughfares & stalls traffic
  },
  roads: {
    roads: 1.0,
    water_drainage: 0.85,
    traffic: 0.70,        // Severe potholes cause traffic bottlenecks
    sanitation: 0.40,
  },
  sanitation: {
    sanitation: 1.0,
    water_drainage: 0.75,
    parks: 0.50,
  },
  electricity: {
    electricity: 1.0,
    traffic: 0.80,        // Power line / pole failure disables traffic signals
    parks: 0.70,          // Uprooted tree brings down overhead power lines
  },
  parks: {
    parks: 1.0,
    electricity: 0.70,
    roads: 0.45,          // Tree roots breaking sidewalk / road
    traffic: 0.60,        // Fallen branch blocking vehicular lanes
  },
  traffic: {
    traffic: 1.0,
    electricity: 0.80,
    roads: 0.70,
    water_drainage: 0.65,
    parks: 0.60,
  },
};

/**
 * Returns category/department relatedness score between 0.0 and 1.0.
 */
export function getCategoryRelatedness(catA: string, catB: string): number {
  if (!catA || !catB) return 0;
  const deptA = CATEGORY_TO_DEPARTMENT[catA.toLowerCase()] || catA.toLowerCase();
  const deptB = CATEGORY_TO_DEPARTMENT[catB.toLowerCase()] || catB.toLowerCase();
  if (deptA === deptB) return 1.0;

  return CATEGORY_RELATEDNESS[deptA]?.[deptB] ?? CATEGORY_RELATEDNESS[deptB]?.[deptA] ?? 0.0;
}

/**
 * Computes exact geodesic distance between two points in meters using the Haversine formula.
 */
export function calculateDistanceMeters(loc1: GeoLocation, loc2: GeoLocation): number {
  const R = 6371e3; // Earth radius in meters
  const lat1Rad = (loc1.lat * Math.PI) / 180;
  const lat2Rad = (loc2.lat * Math.PI) / 180;
  const deltaLat = ((loc2.lat - loc1.lat) * Math.PI) / 180;
  const deltaLng = ((loc2.lng - loc1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

const STOP_WORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'for', 'of',
  'with', 'near', 'by', 'from', 'this', 'that', 'it', 'has', 'have', 'been',
  'road', 'street', 'main', 'cross', 'area', 'please', 'very', 'mysuru',
]);

/**
 * Computes keyword/token Jaccard similarity between two translated complaint texts.
 */
export function calculateTextSimilarity(textA: string, textB: string): number {
  if (!textA || !textB) return 0;

  const tokenize = (t: string): Set<string> => {
    const tokens = t
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
    return new Set(tokens);
  };

  const setA = tokenize(textA);
  const setB = tokenize(textB);

  if (setA.size === 0 || setB.size === 0) return 0;

  let intersectionCount = 0;
  for (const token of setA) {
    if (setB.has(token)) intersectionCount++;
  }

  const unionCount = setA.size + setB.size - intersectionCount;
  return unionCount > 0 ? intersectionCount / unionCount : 0;
}

export interface CandidateEvaluation {
  incident: Incident;
  distanceMeters: number;
  timeDiffDays: number;
  categoryRelatedness: number;
  textSimilarity: number;
  compositeScore: number;
  matchReasons: string[];
}

/**
 * Evaluates an existing incident as a candidate for merging a new report.
 */
export function evaluateCandidateIncident(
  report: Report,
  incident: Incident,
): CandidateEvaluation {
  // 1. Distance check
  const distanceMeters = Math.round(calculateDistanceMeters(report.location, incident.location));
  const distanceFactor = Math.max(0, 1 - distanceMeters / LINKING_CONFIG.maxDistanceMeters);

  // 2. Time window check
  const reportTime = new Date(report.createdAt).getTime();
  const incidentTime = new Date(incident.createdAt).getTime();
  const timeDiffDays = Math.abs(reportTime - incidentTime) / (1000 * 60 * 60 * 24);

  // 3. Category relatedness (compare against incident lead department / category)
  const categoryRelatedness = getCategoryRelatedness(report.category, incident.leadDepartment);

  // 4. Text similarity against incident merged summary
  const textSimilarity = calculateTextSimilarity(report.translatedText || report.text, incident.mergedSummary);

  const matchReasons: string[] = [];

  // Check temporal eligibility
  if (timeDiffDays > LINKING_CONFIG.maxTimeWindowDays) {
    return {
      incident,
      distanceMeters,
      timeDiffDays,
      categoryRelatedness,
      textSimilarity,
      compositeScore: 0,
      matchReasons: ['Report timestamp outside the 14-day cluster window'],
    };
  }

  // Check spatial threshold
  if (distanceMeters > LINKING_CONFIG.maxDistanceMeters) {
    return {
      incident,
      distanceMeters,
      timeDiffDays,
      categoryRelatedness,
      textSimilarity,
      compositeScore: 0,
      matchReasons: [`Distance (${distanceMeters}m) exceeds 150m threshold`],
    };
  }

  // 5. Composite score calculation
  const compositeScore =
    distanceFactor * LINKING_CONFIG.weights.distance +
    categoryRelatedness * LINKING_CONFIG.weights.categoryRelatedness +
    textSimilarity * LINKING_CONFIG.weights.textSimilarity;

  // Compile transparent reasons
  matchReasons.push(`Proximity: ${distanceMeters}m apart (within 150m radius)`);
  if (categoryRelatedness >= 0.8) {
    matchReasons.push(
      report.category === incident.leadDepartment
        ? `Identical category: ${report.category.replace('_', ' ')}`
        : `Cross-category correlation: ${report.category} linked with ${incident.leadDepartment}`
    );
  } else if (categoryRelatedness > 0.5) {
    matchReasons.push(`Related domain: ${report.category} and ${incident.leadDepartment}`);
  }

  if (textSimilarity > 0.15) {
    matchReasons.push(`Text similarity: ${(textSimilarity * 100).toFixed(0)}% keyword overlap`);
  }

  return {
    incident,
    distanceMeters,
    timeDiffDays,
    categoryRelatedness,
    textSimilarity,
    compositeScore: Number(compositeScore.toFixed(3)),
    matchReasons,
  };
}

/**
 * Infers probable root cause for cross-category incidents.
 */
export function generateRootCauseGuess(
  leadDept: Department,
  supportingDepts: Department[],
  memberTexts: string[],
): string | null {
  if (supportingDepts.length === 0) return null;

  const allDepts = new Set([leadDept, ...supportingDepts]);

  if (allDepts.has('water_drainage') && allDepts.has('roads')) {
    return 'Chronic storm drain blockage or backflow causing localized water stagnation, leading to sub-base softening, asphalt peeling, and pothole cratering.';
  }
  if (allDepts.has('sanitation') && allDepts.has('water_drainage')) {
    return 'Accumulated solid waste and illegal garbage disposal blocking storm drain inlets and culverts during rain runoff.';
  }
  if (allDepts.has('electricity') && allDepts.has('traffic')) {
    return 'Localized electrical line fault or transformer drop causing downstream traffic signal controller power failure.';
  }
  if (allDepts.has('parks') && allDepts.has('electricity')) {
    return 'Unpruned heavy tree branch or tree collapse pulling down adjacent overhead low-tension power cables.';
  }
  if (allDepts.has('roads') && allDepts.has('traffic')) {
    return 'Severe road cratering and surface deterioration forcing vehicles to swerve or crawl, creating intersection bottlenecks.';
  }

  return `Inter-departmental correlation between ${Array.from(allDepts).join(' and ')} requiring coordinated civic resolution.`;
}

/**
 * Pure function: links an incoming analyzed report into existing incidents,
 * or creates a new incident. Recomputes priority and updates root cause.
 */
export function linkReportToIncident(
  report: Report,
  existingIncidents: Incident[],
  allReportsMap?: Map<string, Report>,
): {
  incident: Incident;
  isNewIncident: boolean;
  matchReasons: string[];
} {
  // 1. Evaluate all candidates within 150m
  const candidates: CandidateEvaluation[] = [];

  for (const inc of existingIncidents) {
    const evalResult = evaluateCandidateIncident(report, inc);
    if (evalResult.compositeScore >= LINKING_CONFIG.matchThreshold) {
      candidates.push(evalResult);
    }
  }

  // Sort best match first
  candidates.sort((a, b) => b.compositeScore - a.compositeScore);
  const bestMatch = candidates[0];

  const now = report.createdAt || new Date().toISOString();

  // ═══════════════════════════════════════════════════════════════════
  // CASE A: MERGE INTO EXISTING INCIDENT
  // ═══════════════════════════════════════════════════════════════════
  if (bestMatch) {
    const targetIncident = bestMatch.incident;
    const updatedMemberIds = Array.from(new Set([...targetIncident.memberReportIds, report.id]));
    const newReportCount = updatedMemberIds.length;

    // Recompute centroid location
    const memberReports: Report[] = [];
    if (allReportsMap) {
      for (const id of updatedMemberIds) {
        const r = allReportsMap.get(id);
        if (r) memberReports.push(r);
      }
    }
    if (!memberReports.some((r) => r.id === report.id)) {
      memberReports.push(report);
    }

    const avgLat = memberReports.reduce((s, r) => s + r.location.lat, 0) / memberReports.length;
    const avgLng = memberReports.reduce((s, r) => s + r.location.lng, 0) / memberReports.length;

    // Determine lead and supporting departments
    const deptCounts = new Map<Department, number>();
    for (const r of memberReports) {
      const d = r.department || (r.category as Department);
      if (d) deptCounts.set(d, (deptCounts.get(d) || 0) + 1);
    }

    // Lead department has the highest report frequency
    let leadDepartment: Department = targetIncident.leadDepartment;
    let maxCount = 0;
    for (const [dept, count] of deptCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        leadDepartment = dept;
      }
    }

    const supportingDepartments: Department[] = Array.from(deptCounts.keys()).filter(
      (d) => d !== leadDepartment
    );

    // Root cause guess for cross-category incident
    const combinedTexts = memberReports.map((r) => r.translatedText || r.text);
    const rootCauseGuess = generateRootCauseGuess(leadDepartment, supportingDepartments, combinedTexts);

    // Recompute priority score with updated member count and factors
    const combinedSeverityCues = Array.from(
      new Set(memberReports.flatMap((r) => r.aiResult?.severityCues || []))
    );
    const maxImageSeverity = Math.max(...memberReports.map((r) => (r.imageUrl ? 0.6 : 0.2)));
    const earliestTime = memberReports.map((r) => new Date(r.createdAt).getTime()).sort()[0];
    const ageInDays = (Date.now() - earliestTime) / (1000 * 60 * 60 * 24);

    const priorityResult = calculatePriority({
      text: combinedTexts.join(' '),
      reportCount: newReportCount,
      imageSeverity: maxImageSeverity,
      ageInDays: Math.min(14, ageInDays),
      sensitiveLocationScore: targetIncident.priorityFactors.sensitiveLocation,
      previousIncidentsCount: targetIncident.priorityFactors.recurrenceHistory * 5,
      severityCues: combinedSeverityCues,
    });

    const statusHistoryEntry: StatusHistoryEntry = {
      status: targetIncident.status,
      timestamp: now,
      actor: 'system',
      note: `Corroborating report ${report.id} linked into incident (${bestMatch.matchReasons[0]})`,
    };

    const combinedMatchReasons = Array.from(
      new Set([...(targetIncident.matchReasons || []), ...bestMatch.matchReasons])
    );

    const reportSummary = report.aiResult?.summary || report.translatedText || report.text;
    const mergedSummary =
      targetIncident.mergedSummary.includes(reportSummary.slice(0, 40))
        ? targetIncident.mergedSummary
        : `${targetIncident.mergedSummary} Additional report: "${reportSummary.slice(0, 60)}"`;

    const updatedIncident: Incident = {
      ...targetIncident,
      memberReportIds: updatedMemberIds,
      reportCount: newReportCount,
      location: { lat: Number(avgLat.toFixed(5)), lng: Number(avgLng.toFixed(5)) },
      leadDepartment,
      supportingDepartments,
      rootCauseGuess,
      priorityScore: priorityResult.score,
      priorityFactors: priorityResult.factors,
      matchReasons: combinedMatchReasons,
      mergedSummary,
      updatedAt: now,
      statusHistory: [...targetIncident.statusHistory, statusHistoryEntry],
    };

    return {
      incident: updatedIncident,
      isNewIncident: false,
      matchReasons: bestMatch.matchReasons,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // CASE B: CREATE NEW INCIDENT
  // ═══════════════════════════════════════════════════════════════════
  const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  const incId = `INC-${Date.now().toString(36).slice(-3).toUpperCase()}${randomSuffix}`;

  const dept = report.department || (report.category as Department) || 'roads';

  const priorityResult = calculatePriority({
    text: report.translatedText || report.text,
    reportCount: 1,
    imageSeverity: report.imageUrl ? 0.4 : 0.2,
    ageInDays: 0.1,
    sensitiveLocationScore: 0.0,
    previousIncidentsCount: 0,
    severityCues: report.aiResult?.severityCues || [],
  });

  const initialStatus: StatusHistoryEntry = {
    status: 'new',
    timestamp: now,
    actor: 'system',
    note: `Incident opened from initial citizen report ${report.id}`,
  };

  const newIncident: Incident = {
    id: incId,
    memberReportIds: [report.id],
    reportCount: 1,
    mergedSummary: report.aiResult?.summary || report.translatedText || report.text,
    rootCauseGuess: null,
    priorityScore: priorityResult.score,
    priorityFactors: priorityResult.factors,
    leadDepartment: dept,
    supportingDepartments: [],
    location: report.location,
    status: 'new',
    statusHistory: [initialStatus],
    verificationStatus: null,
    closureUnreliable: false,
    createdAt: now,
    updatedAt: now,
    synthetic: report.synthetic ?? true,
    matchReasons: ['Initial report creating new incident centroid'],
  };

  return {
    incident: newIncident,
    isNewIncident: true,
    matchReasons: ['New incident created (no existing incidents within 150m)'],
  };
}
