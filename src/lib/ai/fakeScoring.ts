import type { FakeSignals } from '../../types/ai';
import type { GeoLocation } from '../../types/report';

/**
 * Mysuru Civic Service Area Bounding Box.
 * Reports located outside this geographic envelope are flagged.
 */
export const MYSURU_SERVICE_BOUNDS = {
  minLat: 12.18,
  maxLat: 12.42,
  minLng: 76.50,
  maxLng: 76.78,
} as const;

/**
 * Weights assigned to each suspicious signal.
 * High total score routes the report to human review.
 * CRITICAL RULE: High fake score NEVER auto-rejects; it only routes to the review queue.
 */
export const FAKE_SIGNAL_WEIGHTS = {
  textImageMismatch: 35,      // Visual content contradicts written complaint
  reusedImageHash: 35,        // Duplicate image already used in another ticket
  gibberishText: 30,          // Nonsensical or unparseable keystroke text
  noSceneInImage: 25,         // Image shows indoors, selfies, food menus, or solid colors
  outOfServiceArea: 25,       // Pin located outside Mysuru jurisdiction
  rapidRepeatSubmission: 25,  // Burst submissions from same IP/device in under 60 seconds
  reviewThreshold: 60,        // Score >= 60 triggers the human review queue
} as const;

export interface FakeScoringInput {
  text: string;
  location?: GeoLocation;
  textImageMismatch?: boolean;
  noSceneInImage?: boolean;
  rapidRepeatSubmission?: boolean;
  imageHash?: string | null;
  /** Set of previously registered image hashes */
  knownImageHashes?: Set<string> | string[];
}

export interface FakeSuspicionResult {
  /** Composite suspicion score (0 to 100) */
  fakeScore: number;
  /** Granular signal breakdown */
  signals: FakeSignals;
  /** Human-readable explanation of why this report was flagged */
  reasons: string[];
  /**
   * Whether to send this report to human review.
   * True if fakeScore >= 60.
   * NOTE: Never auto-rejects. Reports remain in the system for human review.
   */
  routeToReviewQueue: boolean;
  /** Status assignment for the report */
  assignedStatus: 'new' | 'under_review';
}

/**
 * Detects whether text is gibberish or too short to describe a real civic issue.
 */
export function isGibberishOrTooShort(text: string): boolean {
  if (!text) return true;
  const clean = text.trim();
  if (clean.length < 8) return true;

  // Single repeated character pattern (e.g. "aaaaaaa", ".........")
  if (/^(.)\1{4,}$/i.test(clean)) return true;

  const words = clean.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;

  // Keyboard mash patterns (home row, top row, bottom row)
  const mashPattern = /\b(asdf|fdsa|jkl|lkj|qwerty|ytrewq|zxcv|vcxz|1234|bloop|bleep|zzzz|xxxx|yyyy)\b/i;
  const repetitiveCharPattern = /(.)\1{3,}/; // 4+ repeated chars anywhere in a word (e.g. "zzzz")

  let spamWordCount = 0;
  for (const w of words) {
    if (mashPattern.test(w) || repetitiveCharPattern.test(w)) {
      spamWordCount++;
    } else if (w.length > 5 && !/[aeiouy\u0C80-\u0CFF\u0900-\u097F]/i.test(w)) {
      // 6+ characters with no vowels in English/Indic scripts
      spamWordCount++;
    }
  }

  // If 2 or more words are mash/spam, or >= 30% of total words
  if (spamWordCount >= 2 || (words.length > 0 && spamWordCount / words.length >= 0.3)) {
    return true;
  }

  return false;
}

/**
 * Checks whether coordinates lie outside the Mysuru municipal bounds.
 */
export function isOutOfServiceArea(location?: GeoLocation): boolean {
  if (!location) return false;
  const { lat, lng } = location;
  if (typeof lat !== 'number' || typeof lng !== 'number') return true;

  return (
    lat < MYSURU_SERVICE_BOUNDS.minLat ||
    lat > MYSURU_SERVICE_BOUNDS.maxLat ||
    lng < MYSURU_SERVICE_BOUNDS.minLng ||
    lng > MYSURU_SERVICE_BOUNDS.maxLng
  );
}

/**
 * Pure function: calculates fake/spam suspicion score and reasons.
 * Reports with high score go to the review queue — NEVER auto-rejected.
 */
export function calculateFakeSuspicion(input: FakeScoringInput): FakeSuspicionResult {
  const reasons: string[] = [];
  let score = 0;

  // 1. Text-Image Mismatch
  const textImageMismatch = Boolean(input.textImageMismatch);
  if (textImageMismatch) {
    score += FAKE_SIGNAL_WEIGHTS.textImageMismatch;
    reasons.push('Text description does not match visual content in photo');
  }

  // 2. No Scene in Image
  const noSceneInImage = Boolean(input.noSceneInImage);
  if (noSceneInImage) {
    score += FAKE_SIGNAL_WEIGHTS.noSceneInImage;
    reasons.push('Image contains no recognizable outdoor or civic infrastructure scene');
  }

  // 3. Gibberish or very short text
  const gibberishText = isGibberishOrTooShort(input.text);
  if (gibberishText) {
    score += FAKE_SIGNAL_WEIGHTS.gibberishText;
    reasons.push('Complaint text is extremely short or resembles random keystrokes');
  }

  // 4. Rapid Repeat Submissions
  const rapidRepeatSubmission = Boolean(input.rapidRepeatSubmission);
  if (rapidRepeatSubmission) {
    score += FAKE_SIGNAL_WEIGHTS.rapidRepeatSubmission;
    reasons.push('Multiple complaints logged in rapid succession from this source');
  }

  // 5. Out of Service Area
  const outOfServiceArea = isOutOfServiceArea(input.location);
  if (outOfServiceArea) {
    score += FAKE_SIGNAL_WEIGHTS.outOfServiceArea;
    reasons.push(
      `Location (${input.location?.lat.toFixed(4)}, ${input.location?.lng.toFixed(4)}) is outside the Mysuru municipal service area`
    );
  }

  // 6. Reused Image Hash
  let reusedImageHash = false;
  if (input.imageHash && input.knownImageHashes) {
    if (input.knownImageHashes instanceof Set) {
      reusedImageHash = input.knownImageHashes.has(input.imageHash);
    } else if (Array.isArray(input.knownImageHashes)) {
      reusedImageHash = input.knownImageHashes.includes(input.imageHash);
    }
  }
  if (reusedImageHash) {
    score += FAKE_SIGNAL_WEIGHTS.reusedImageHash;
    reasons.push(`Attached photo has an identical digital hash to a previously submitted report`);
  }

  // Cap score at 100
  const fakeScore = Math.min(100, Math.round(score));

  const signals: FakeSignals = {
    textImageMismatch,
    noSceneInImage,
    rapidRepeatSubmission,
    gibberishText,
    outOfServiceArea,
    reusedImageHash,
  };

  // Rule: never auto-reject. High scores trigger the human review queue.
  const routeToReviewQueue = fakeScore >= FAKE_SIGNAL_WEIGHTS.reviewThreshold;
  const assignedStatus: 'new' | 'under_review' = routeToReviewQueue ? 'under_review' : 'new';

  return {
    fakeScore,
    signals,
    reasons,
    routeToReviewQueue,
    assignedStatus,
  };
}
