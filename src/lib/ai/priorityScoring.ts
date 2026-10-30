import type { PriorityFactors } from '../../types/ai';

/**
 * Weights configuration for the deterministic priority function.
 * Total sum of weights equals 1.0 (100%).
 *
 * NOTE: The LLM NEVER invents the priority score. It is strictly computed
 * by this mathematical formula for auditable, reproducible civic governance.
 */
export const PRIORITY_CONFIG = {
  weights: {
    safetyRisk: 0.30,        // Life/safety danger, sparks, open manholes
    peopleAffected: 0.20,    // Corroborating report count in cluster
    sensitiveLocation: 0.15, // Near schools, hospitals, emergency corridors
    imageSeverity: 0.15,     // Visual evidence of severe deterioration
    age: 0.10,               // Aging unresolved complaints gain urgency
    recurrenceHistory: 0.10, // Recurring hotspots indicate structural failure
  },
  safetyOverrideMinimumScore: 90, // Forced critical floor when safety keyword is present
} as const;

/**
 * Safety keyword overrides across English, Kannada, and Hindi.
 * If any of these are present, the incident is forced to Critical severity.
 */
export const SAFETY_KEYWORD_OVERRIDES: { pattern: RegExp; reason: string }[] = [
  { pattern: /\b(live wire|sparking wire|snapped cable|electric shock|exposed conductor)\b/i, reason: 'Live electrical hazard / electrocution risk' },
  { pattern: /\b(open manhole|missing manhole cover|uncovered manhole|open drain pit)\b/i, reason: 'Fatal fall hazard / open manhole' },
  { pattern: /\b(fallen tree|tree collapse|blocked ambulance|road completely blocked)\b/i, reason: 'Total thoroughfare obstruction / emergency path blocked' },
  { pattern: /\b(gas leak|lpg leak|cylinder leak|fire hazard)\b/i, reason: 'Explosive / chemical risk' },
  { pattern: /\b(wall collapse|bridge crack|structural failure|cave in)\b/i, reason: 'Impending structural collapse' },
  // Kannada safety keywords
  { pattern: /(ಲೈವ್ ವೈರ್|ವಿದ್ಯುತ್ ತಂತಿ|ಕಿಡಿ|ಶಾಕ್)/, reason: 'ವಿದ್ಯುತ್ ಅಪಾಯ (Electrical danger)' },
  { pattern: /(ಮ್ಯಾನ್‌ಹೋಲ್ ಮುಚ್ಚಳ ಇಲ್ಲ|ತೆರೆದ ಮ್ಯಾನ್‌ಹೋಲ್|ಗುಂಡಿ)/, reason: 'ತೆರೆದ ಮ್ಯಾನ್‌ಹೋಲ್ ಅಪಾಯ (Open manhole hazard)' },
  { pattern: /(ಮರ ಬಿದ್ದಿದೆ|ರಸ್ತೆ ಸಂಪೂರ್ಣ ಬಂದ್)/, reason: 'ರಸ್ತೆ ತಡೆದ ಬಿದ್ದ ಮರ (Fallen tree road blockage)' },
  // Hindi safety keywords
  { pattern: /(बिजली का तार|करंट|चिंगारी)/, reason: 'बिजली का गंभीर खतरा (Live wire risk)' },
  { pattern: /(खुला मैनहोल|मैनहोल का ढक्कन गायब|गहरा गड्ढा)/, reason: 'खुला मैनहोल खतरा (Open manhole risk)' },
  { pattern: /(पेड़ गिर गया|रास्ता पूरी तरह बंद)/, reason: 'रास्ता बंद / पेड़ गिरा (Fallen tree road blockage)' },
];

export interface PriorityInput {
  /** Combined complaint text from one or more reports in this incident */
  text: string;
  /** Number of corroborating citizen reports merged into this incident */
  reportCount: number;
  /** Image severity rating from visual analysis (0.0 to 1.0), or 0 if no image */
  imageSeverity?: number;
  /** Age of oldest report in days */
  ageInDays?: number;
  /** Proximity to sensitive facility: hospital = 1.0, school = 0.8, transit hub = 0.6, none = 0 */
  sensitiveLocationScore?: number;
  /** Previous incidents logged at this exact location / junction (0 to 5+) */
  previousIncidentsCount?: number;
  /** Explicit safety cues extracted during triage */
  severityCues?: string[];
}

export interface PriorityResult {
  /** Deterministic score from 0 to 100 */
  score: number;
  /** Priority tier */
  tier: 'Critical' | 'High' | 'Medium' | 'Low';
  /** Normalized factor values (0.0 to 1.0) */
  factors: PriorityFactors;
  /** True if safety keyword override forced critical */
  safetyOverrideTriggered: boolean;
  /** Reasons for safety override, if triggered */
  overrideReasons: string[];
  /** Plain-language explanation generated deterministically from factors (no LLM) */
  explanation: string;
}

/**
 * Calculates deterministic priority score and generates factor breakdown.
 */
export function calculatePriority(input: PriorityInput): PriorityResult {
  const text = input.text || '';
  const overrideReasons: string[] = [];

  // 1. Check Safety Keyword Overrides
  for (const { pattern, reason } of SAFETY_KEYWORD_OVERRIDES) {
    if (pattern.test(text)) {
      overrideReasons.push(reason);
    }
  }

  const hasSafetyOverride = overrideReasons.length > 0;

  // 2. Normalize Factors to [0.0, 1.0]
  // Safety Risk: 1.0 if safety override; otherwise scaled by cues count
  let safetyRisk = hasSafetyOverride ? 1.0 : 0.2;
  if (!hasSafetyOverride && input.severityCues && input.severityCues.length > 0) {
    safetyRisk = Math.min(1.0, 0.3 + input.severityCues.length * 0.2);
  }

  // People Affected: logarithmic curve (1 report = 0.1, 3 reports = 0.5, 7+ reports = 1.0)
  const reportCount = Math.max(1, input.reportCount || 1);
  const peopleAffected = Math.min(1.0, Number((Math.log10(reportCount) / Math.log10(8)).toFixed(2)) + 0.1);

  // Sensitive Location: 0.0 to 1.0
  const sensitiveLocation = Math.min(1.0, Math.max(0, input.sensitiveLocationScore || 0));

  // Image Severity: 0.0 to 1.0
  const imageSeverity = Math.min(1.0, Math.max(0, input.imageSeverity || 0));

  // Age: maxed out at 14 days (14 days = 1.0)
  const ageDays = Math.max(0, input.ageInDays || 0);
  const age = Math.min(1.0, Number((ageDays / 14).toFixed(2)));

  // Recurrence History: 5 previous incidents = 1.0
  const recurrence = Math.min(1.0, Number(((input.previousIncidentsCount || 0) / 5).toFixed(2)));

  const factors: PriorityFactors = {
    safetyRisk: Number(safetyRisk.toFixed(2)),
    peopleAffected: Number(peopleAffected.toFixed(2)),
    sensitiveLocation: Number(sensitiveLocation.toFixed(2)),
    imageSeverity: Number(imageSeverity.toFixed(2)),
    age: Number(age.toFixed(2)),
    recurrenceHistory: Number(recurrence.toFixed(2)),
  };

  // 3. Compute Weighted Sum
  const { weights } = PRIORITY_CONFIG;
  const rawScore =
    factors.safetyRisk * weights.safetyRisk * 100 +
    factors.peopleAffected * weights.peopleAffected * 100 +
    factors.sensitiveLocation * weights.sensitiveLocation * 100 +
    factors.imageSeverity * weights.imageSeverity * 100 +
    factors.age * weights.age * 100 +
    factors.recurrenceHistory * weights.recurrenceHistory * 100;

  let score = Math.round(rawScore);

  // Apply safety override floor if triggered
  if (hasSafetyOverride && score < PRIORITY_CONFIG.safetyOverrideMinimumScore) {
    score = PRIORITY_CONFIG.safetyOverrideMinimumScore;
  }

  // Ensure score is bounded between 0 and 100
  score = Math.max(0, Math.min(100, score));

  // 4. Determine Tier
  let tier: 'Critical' | 'High' | 'Medium' | 'Low' = 'Low';
  if (score >= 80) tier = 'Critical';
  else if (score >= 60) tier = 'High';
  else if (score >= 35) tier = 'Medium';

  // 5. Generate Plain-Language Explanation (Deterministic, No LLM Needed)
  const explanation = generatePriorityExplanation(score, tier, factors, overrideReasons, reportCount);

  return {
    score,
    tier,
    factors,
    safetyOverrideTriggered: hasSafetyOverride,
    overrideReasons,
    explanation,
  };
}

/**
 * Deterministically constructs a transparent explanation of the score.
 */
function generatePriorityExplanation(
  score: number,
  tier: string,
  factors: PriorityFactors,
  overrideReasons: string[],
  reportCount: number,
): string {
  const parts: string[] = [];

  if (overrideReasons.length > 0) {
    parts.push(`SAFETY OVERRIDE TRIGGERED: ${overrideReasons.join(', ')}.`);
  }

  // Identify top contributing factors
  const factorContributions = [
    { name: 'life/safety risk', value: factors.safetyRisk * PRIORITY_CONFIG.weights.safetyRisk },
    { name: 'citizen cluster volume', value: factors.peopleAffected * PRIORITY_CONFIG.weights.peopleAffected },
    { name: 'proximity to sensitive facilities', value: factors.sensitiveLocation * PRIORITY_CONFIG.weights.sensitiveLocation },
    { name: 'visual severity', value: factors.imageSeverity * PRIORITY_CONFIG.weights.imageSeverity },
    { name: 'unresolved age', value: factors.age * PRIORITY_CONFIG.weights.age },
    { name: 'recurrence history', value: factors.recurrenceHistory * PRIORITY_CONFIG.weights.recurrenceHistory },
  ].sort((a, b) => b.value - a.value);

  const top1 = factorContributions[0];
  const top2 = factorContributions[1];

  let summarySentence = `Ranked ${tier} (Score ${score}/100). `;
  summarySentence += `Driven primarily by ${top1.name} (factor ${Math.round(top1.value * 100 / 0.3)}%) and ${top2.name}.`;
  parts.push(summarySentence);

  if (reportCount > 1) {
    parts.push(`Aggregated from ${reportCount} corroborating citizen reports.`);
  }
  if (factors.sensitiveLocation > 0.5) {
    parts.push(`Urgency elevated due to nearby school or healthcare facility.`);
  }
  if (factors.recurrenceHistory > 0.4) {
    parts.push(`Location exhibits recurring infrastructure failures.`);
  }

  return parts.join(' ');
}
