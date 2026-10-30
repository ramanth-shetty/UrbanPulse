import { callGeminiRest, GEMINI_PRIMARY_MODEL, GEMINI_LIGHTER_MODEL } from '@/lib/gemini';
import { MOCKED_CREWS } from '@/lib/mockedCrews';
import { DEPARTMENT_LABELS, type Department } from '@/types/department';
import type { Incident } from '@/types/incident';

export interface MorningBriefContent {
  executiveHeadline: string;
  whatToFixFirst: {
    incidentId: string;
    summary: string;
    actionRecommendation: string;
    targetLocation: string;
  };
  why: string;
  suggestedCrewGrouping: Array<{
    crewName: string;
    clusterArea: string;
    assignedIncidentIds: string[];
    rationale: string;
  }>;
  risks: string[];
}

export interface MorningBrief {
  department: Department;
  departmentLabel: string;
  generatedAt: string;
  aiGenerated: boolean;
  fallbackUsed: boolean;
  topIncidents: Incident[]; // strictly unmodified deterministic scores
  brief: MorningBriefContent;
}

/**
 * Deterministic fallback generator when Gemini is unreachable or disabled.
 * Generates the brief from deterministic incident factors.
 */
export function generateTemplateMorningBrief(
  department: Department,
  topIncidents: Incident[]
): MorningBriefContent {
  const deptLabel = DEPARTMENT_LABELS[department] || department;
  const crews = MOCKED_CREWS[department] || ['MCC Quick Response Unit'];

  if (topIncidents.length === 0) {
    return {
      executiveHeadline: `All clear: No active priority incidents pending for ${deptLabel}.`,
      whatToFixFirst: {
        incidentId: 'N/A',
        summary: `No pending complaints recorded for ${deptLabel}.`,
        actionRecommendation: 'Standby for new citizen reports or routine ward inspections.',
        targetLocation: 'Ward HQ',
      },
      why: 'No open complaints currently exceed threshold severity.',
      suggestedCrewGrouping: [
        {
          crewName: crews[0],
          clusterArea: 'Central Division',
          assignedIncidentIds: [],
          rationale: 'Stationed at sub-station on standby.',
        },
      ],
      risks: ['None currently identified.'],
    };
  }

  const primary = topIncidents[0];
  const factors = primary.priorityFactors;
  const factorReasons: string[] = [];
  if (factors.safetyRisk >= 0.7) factorReasons.push(`acute life/safety risk (${Math.round(factors.safetyRisk * 100)}%)`);
  if (factors.sensitiveLocation > 0) factorReasons.push('proximity to a school or hospital');
  if (factors.peopleAffected >= 0.4) factorReasons.push(`high citizen cluster volume (${primary.reportCount} reports)`);
  if (factors.age >= 0.4) factorReasons.push('aging unresolved complaint duration');
  if (primary.closureUnreliable) factorReasons.push('previous closure was marked UNRELIABLE by on-site citizen inspection');

  const whyText = factorReasons.length > 0
    ? `Incident ${primary.id} carries the highest deterministic urgency (${primary.priorityScore}/100) driven primarily by ${factorReasons.join(', ')}.`
    : `Incident ${primary.id} ranks highest in the ${deptLabel} queue with deterministic priority score of ${primary.priorityScore}/100.`;

  // Group crews across the top incidents
  const groupings = topIncidents.map((inc, idx) => {
    const assignedCrew = inc.assignedCrew || crews[idx % crews.length];
    return {
      crewName: assignedCrew,
      clusterArea: `Lat ${inc.location.lat.toFixed(4)}, Lng ${inc.location.lng.toFixed(4)}`,
      assignedIncidentIds: [inc.id],
      rationale: `Deploy to resolve ${inc.mergedSummary.slice(0, 60)}... (${inc.reportCount} report${inc.reportCount > 1 ? 's' : ''}, Priority: ${inc.priorityScore}/100)`,
    };
  });

  const risks: string[] = [];
  if (factors.safetyRisk >= 0.8) {
    risks.push('Severe hazard to pedestrians and vehicles if not cordoned or resolved immediately.');
  }
  if (factors.sensitiveLocation > 0) {
    risks.push('Disruption to vulnerable populations near schools, medical facilities, or heavy morning transit corridors.');
  }
  if (primary.reportCount > 2) {
    risks.push(`Citizen escalation risk: Multiple corroborating reports (${primary.reportCount}) indicate compounding neighborhood disruption.`);
  }
  if (primary.closureUnreliable) {
    risks.push('Public credibility risk: A previous municipal resolution was disputed as incomplete by a reporting citizen.');
  }
  if (risks.length === 0) {
    risks.push('Unattended infrastructure degradation spreading to adjacent roads or utility channels.');
  }

  return {
    executiveHeadline: `${deptLabel} Morning Dispatch: Priority focus on ${primary.id} (Score ${primary.priorityScore}/100).`,
    whatToFixFirst: {
      incidentId: primary.id,
      summary: primary.mergedSummary,
      actionRecommendation: primary.rootCauseGuess
        ? `Tackle suspected root cause: ${primary.rootCauseGuess}`
        : `Dispatch immediate repair team to inspect and stabilize site.`,
      targetLocation: `Centroid (${primary.location.lat.toFixed(4)}, ${primary.location.lng.toFixed(4)})`,
    },
    why: whyText,
    suggestedCrewGrouping: groupings,
    risks,
  };
}

/**
 * Builds the prompt for Gemini. Note: Explicitly instructs the LLM
 * that scores and factors are immutable and must not be recalculated.
 */
function buildGeminiPrompt(department: Department, topIncidents: Incident[]): string {
  const deptLabel = DEPARTMENT_LABELS[department] || department;
  const crews = MOCKED_CREWS[department] || [];

  const incidentSummaries = topIncidents.map((inc, i) => `
Incident #${i + 1}:
- ID: ${inc.id}
- Deterministic Priority Score: ${inc.priorityScore}/100 (FIXED - DO NOT ALTER)
- Status: ${inc.status}
- Closure Unreliable / Disputed: ${inc.closureUnreliable ? 'YES (Citizen verified NOT fixed)' : 'No'}
- Report Count: ${inc.reportCount} linked complaints
- Location: (${inc.location.lat.toFixed(4)}, ${inc.location.lng.toFixed(4)})
- Root Cause Deduction: ${inc.rootCauseGuess || 'None specified'}
- Summary: "${inc.mergedSummary}"
- Factors: Safety Risk=${Math.round(inc.priorityFactors.safetyRisk * 100)}%, People Affected=${Math.round(inc.priorityFactors.peopleAffected * 100)}%, Sensitive Facility=${Math.round(inc.priorityFactors.sensitiveLocation * 100)}%, Visual Severity=${Math.round(inc.priorityFactors.imageSeverity * 100)}%, Age=${Math.round(inc.priorityFactors.age * 100)}%, Recurrence=${Math.round(inc.priorityFactors.recurrenceHistory * 100)}%
`).join('\n');

  return `You are the Morning Operations Dispatcher for Mysore City Corporation (MCC) in Karnataka, India.
Generate a concise, professional, military-style morning action briefing for the ${deptLabel} department.

CRITICAL INSTRUCTIONS:
1. You narrate and organize action ONLY. You must NOT alter, recalculate, or invent priority scores. The provided scores and factor weights are strictly deterministic.
2. Focus on actionability: what crew needs to be where, why, and what happens if delayed.
3. Suggest grouping of available municipal crews (${crews.join(', ')}) by geographic location.
4. Return strict JSON matching the schema below.

Top 3 Ranked Incidents for ${deptLabel}:
${incidentSummaries}

JSON Schema required:
{
  "executiveHeadline": "A single punchy 1-sentence headline summarizing today's primary focus",
  "whatToFixFirst": {
    "incidentId": "${topIncidents[0]?.id || 'INC-001'}",
    "summary": "Brief problem summary",
    "actionRecommendation": "Specific physical action the crew must take on arrival",
    "targetLocation": "Coordinates or street area description"
  },
  "why": "2-3 sentences explaining why this incident is #1, citing the exact deterministic safety factors, citizen volume, and hospital/school proximity",
  "suggestedCrewGrouping": [
    {
      "crewName": "Name of crew from available list",
      "clusterArea": "Geographic area description",
      "assignedIncidentIds": ["incident IDs"],
      "rationale": "Why this crew is assigned here (e.g. proximity, equipment required)"
    }
  ],
  "risks": [
    "Specific operational or safety risk 1 if delayed",
    "Specific operational or safety risk 2 if delayed"
  ]
}`;
}

/**
 * Generates the Morning Brief for a department.
 * Attempts Gemini first, with seamless fallback to template brief.
 */
export async function generateMorningBrief(
  department: Department,
  topIncidents: Incident[]
): Promise<MorningBrief> {
  const deptLabel = DEPARTMENT_LABELS[department] || department;
  const now = new Date().toISOString();

  // If there are no incidents, return template directly
  if (topIncidents.length === 0) {
    return {
      department,
      departmentLabel: deptLabel,
      generatedAt: now,
      aiGenerated: false,
      fallbackUsed: true,
      topIncidents: [],
      brief: generateTemplateMorningBrief(department, []),
    };
  }

  // Attempt Gemini AI narration
  try {
    const prompt = buildGeminiPrompt(department, topIncidents);
    let rawJson: string;

    try {
      rawJson = await callGeminiRest(GEMINI_PRIMARY_MODEL, prompt);
    } catch (primaryErr) {
      console.warn('Primary model failed for morning brief, retrying with lighter model:', primaryErr);
      rawJson = await callGeminiRest(GEMINI_LIGHTER_MODEL, prompt);
    }

    // Clean potential markdown fencing
    let cleanJson = rawJson.trim();
    if (cleanJson.startsWith('```json')) cleanJson = cleanJson.slice(7);
    if (cleanJson.startsWith('```')) cleanJson = cleanJson.slice(3);
    if (cleanJson.endsWith('```')) cleanJson = cleanJson.slice(0, -3);

    const parsed = JSON.parse(cleanJson.trim());

    if (!parsed.whatToFixFirst || !parsed.why || !parsed.suggestedCrewGrouping) {
      throw new Error('Gemini output missing required briefing fields');
    }

    return {
      department,
      departmentLabel: deptLabel,
      generatedAt: now,
      aiGenerated: true,
      fallbackUsed: false,
      topIncidents, // pure deterministic incidents preserved
      brief: {
        executiveHeadline: parsed.executiveHeadline || `${deptLabel} Morning Briefing`,
        whatToFixFirst: {
          incidentId: parsed.whatToFixFirst.incidentId || topIncidents[0].id,
          summary: parsed.whatToFixFirst.summary || topIncidents[0].mergedSummary,
          actionRecommendation: parsed.whatToFixFirst.actionRecommendation || 'Deploy crew for immediate on-site repair.',
          targetLocation: parsed.whatToFixFirst.targetLocation || `Centroid (${topIncidents[0].location.lat.toFixed(4)}, ${topIncidents[0].location.lng.toFixed(4)})`,
        },
        why: parsed.why,
        suggestedCrewGrouping: Array.isArray(parsed.suggestedCrewGrouping)
          ? parsed.suggestedCrewGrouping
          : [],
        risks: Array.isArray(parsed.risks) ? parsed.risks : [],
      },
    };
  } catch (err) {
    console.warn(`Gemini morning brief generation failed for ${department}, applying deterministic fallback:`, err);
    return {
      department,
      departmentLabel: deptLabel,
      generatedAt: now,
      aiGenerated: false,
      fallbackUsed: true,
      topIncidents, // pure deterministic incidents preserved
      brief: generateTemplateMorningBrief(department, topIncidents),
    };
  }
}

