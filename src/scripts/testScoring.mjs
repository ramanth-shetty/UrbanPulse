import { calculatePriority } from '../lib/ai/priorityScoring.ts';
import { calculateFakeSuspicion } from '../lib/ai/fakeScoring.ts';

console.log('═══════════════════════════════════════════════════════════════');
console.log('🧪 TESTING PURE FUNCTIONS: PRIORITY & FAKE SUSPICION SCORING');
console.log('═══════════════════════════════════════════════════════════════\n');

// ─────────────────────────────────────────────────────────────────────
// 1. PRIORITY SCORING TESTS (5 SAMPLES)
// ─────────────────────────────────────────────────────────────────────
console.log('--- [1/2] PRIORITY SCORING TESTS ---');

const prioritySamples = [
  {
    name: 'Sample 1: Emergency Live Wire (Safety Override)',
    input: {
      text: 'URGENT: Live wire hanging low on Devaraja Urs Road near the market entrance. Sparking when touching metal shutter.',
      reportCount: 1,
      imageSeverity: 0.8,
      ageInDays: 0.1,
      sensitiveLocationScore: 0.2,
      previousIncidentsCount: 1,
      severityCues: ['live wire', 'sparking', 'electrocution risk'],
    },
  },
  {
    name: 'Sample 2: Open Manhole Outside KR Hospital (Override + Sensitive Location)',
    input: {
      text: 'DANGEROUS: Open manhole right outside KR Hospital main gate. Patients could fall in.',
      reportCount: 3,
      imageSeverity: 0.7,
      ageInDays: 1,
      sensitiveLocationScore: 1.0, // Hospital
      previousIncidentsCount: 2,
      severityCues: ['open manhole', 'hospital entrance'],
    },
  },
  {
    name: 'Sample 3: Large Citizen Cluster on Sayyaji Rao Road (High Volume + Recurrence)',
    input: {
      text: 'Persistent drain blockage causing waterlogging and road damage on Sayyaji Rao Road near clock tower.',
      reportCount: 7, // 7 corroborating citizen reports
      imageSeverity: 0.6,
      ageInDays: 5,
      sensitiveLocationScore: 0.3,
      previousIncidentsCount: 4, // recurring failure
      severityCues: ['overflow', 'waterlogging', 'road damage'],
    },
  },
  {
    name: 'Sample 4: Aging Unresolved Pothole (High Age, Moderate Severity)',
    input: {
      text: 'Deep pothole on Bogadi Road near Infosys flyover. Damaged vehicle wheel.',
      reportCount: 1,
      imageSeverity: 0.5,
      ageInDays: 13, // 13 days unresolved
      sensitiveLocationScore: 0.0,
      previousIncidentsCount: 0,
      severityCues: ['pothole', 'vehicle damage'],
    },
  },
  {
    name: 'Sample 5: Minor Park Overgrowth (Low Urgency Across All Factors)',
    input: {
      text: 'Grass is a bit tall in Jayalakshmipuram park. Needs routine mowing.',
      reportCount: 1,
      imageSeverity: 0.2,
      ageInDays: 2,
      sensitiveLocationScore: 0.0,
      previousIncidentsCount: 0,
      severityCues: [],
    },
  },
];

for (let i = 0; i < prioritySamples.length; i++) {
  const { name, input } = prioritySamples[i];
  const res = calculatePriority(input);

  console.log(`\n📌 ${name}`);
  console.log(`   Score: ${res.score}/100 | Tier: ${res.tier}`);
  console.log(`   Safety Override: ${res.safetyOverrideTriggered ? 'YES (' + res.overrideReasons.join(', ') + ')' : 'No'}`);
  console.log(`   Factors:`, res.factors);
  console.log(`   Explanation: "${res.explanation}"`);
}

// ─────────────────────────────────────────────────────────────────────
// 2. FAKE SUSPICION SCORING TESTS (5 SAMPLES)
// ─────────────────────────────────────────────────────────────────────
console.log('\n\n--- [2/2] FAKE SUSPICION SCORING TESTS ---');

const knownHashes = new Set(['hash_1234_pothole_sayyaji', 'hash_5678_garbage_kuvem']);

const fakeSamples = [
  {
    name: 'Sample 1: Legitimate Citizen Complaint',
    input: {
      text: 'Drain blocked near Saraswathipuram 4th cross, water pooling on street.',
      location: { lat: 12.318, lng: 76.637 }, // Within Mysuru
      textImageMismatch: false,
      noSceneInImage: false,
      rapidRepeatSubmission: false,
      imageHash: 'unique_hash_9999',
      knownImageHashes: knownHashes,
    },
  },
  {
    name: 'Sample 2: Gibberish Keystroke Spam',
    input: {
      text: 'asdf jkl qwerty zzzz bad road fix asdf',
      location: { lat: 12.308, lng: 76.653 }, // Within Mysuru
      textImageMismatch: false,
      noSceneInImage: false,
      rapidRepeatSubmission: false,
    },
  },
  {
    name: 'Sample 3: Reused Duplicate Photo Hash',
    input: {
      text: 'Pothole on Gokulam road getting bigger every day.',
      location: { lat: 12.314, lng: 76.638 }, // Within Mysuru
      imageHash: 'hash_1234_pothole_sayyaji', // Matches previously registered photo!
      knownImageHashes: knownHashes,
    },
  },
  {
    name: 'Sample 4: Outside Service Area (GPS in Bengaluru / Delhi)',
    input: {
      text: 'Big pothole on the ring road near exit 4.',
      location: { lat: 12.9716, lng: 77.5946 }, // Bengaluru, not Mysuru!
      textImageMismatch: false,
      noSceneInImage: false,
    },
  },
  {
    name: 'Sample 5: Multi-Signal Flag (Mismatch + No Scene + Rapid Bursts -> Review Queue)',
    input: {
      text: 'Road broken completely broken fix it now.',
      location: { lat: 12.308, lng: 76.653 },
      textImageMismatch: true, // Photo of restaurant food vs road claim
      noSceneInImage: true,   // Indoor photo
      rapidRepeatSubmission: true, // Burst submissions
    },
  },
];

for (let i = 0; i < fakeSamples.length; i++) {
  const { name, input } = fakeSamples[i];
  const res = calculateFakeSuspicion(input);

  console.log(`\n🕵️ ${name}`);
  console.log(`   Suspicion Score: ${res.fakeScore}/100`);
  console.log(`   Assigned Status: ${res.assignedStatus.toUpperCase()}`);
  console.log(`   Route to Review Queue: ${res.routeToReviewQueue ? 'YES (Flagged for human triage)' : 'No (Normal queue)'}`);
  console.log(`   Reasons (${res.reasons.length}):`, res.reasons.length ? res.reasons : ['None (Clean report)']);
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY');
console.log('═══════════════════════════════════════════════════════════════\n');

