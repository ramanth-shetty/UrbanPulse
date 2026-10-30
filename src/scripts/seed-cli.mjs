import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// ── 1. Load .env.local if present ────────────────────────────────────
const envLocalPath = path.join(rootDir, '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const projectId =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  process.env.FIREBASE_PROJECT_ID;

if (!projectId) {
  console.error('\n❌ ERROR: Firebase Project ID not found!');
  console.error('Please configure .env.local with NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id');
  console.error('See .env.local.example for reference.\n');
  process.exit(1);
}

// ── 2. Load seed reports JSON ────────────────────────────────────────
const jsonPath = path.join(__dirname, '../data/seedReports.json');
const rawReports = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// ── 3. Duplicate groups & Incident definitions ───────────────────────
const INCIDENT_DEFS = [
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
    rootCauseGuess:
      'Skipped maintenance cycle for this park. Needs full clearing and regular mowing schedule.',
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
    rootCauseGuess:
      'Signal controller failure or power supply issue at the junction.',
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
    rootCauseGuess:
      'Unauthorized dumping spot near the school. Needs clearance and anti-dumping measures.',
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
    rootCauseGuess:
      'Blocked drain near hospital entrance combined with low-lying road grade.',
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

// ── 4. Build reports & incidents ─────────────────────────────────────
function buildDataset() {
  const allReports = [];
  const allIncidents = [];

  const grouped = new Map();
  const ungrouped = [];

  for (const r of rawReports) {
    if (r.group) {
      const arr = grouped.get(r.group) ?? [];
      arr.push(r);
      grouped.set(r.group, arr);
    } else {
      ungrouped.push(r);
    }
  }

  // 4a. Grouped incidents
  for (const def of INCIDENT_DEFS) {
    const members = grouped.get(def.group);
    if (!members) continue;

    const reports = members.map((m) => hydrateReport(m, def.id));
    allReports.push(...reports);

    const avgLat = reports.reduce((s, r) => s + r.location.lat, 0) / reports.length;
    const avgLng = reports.reduce((s, r) => s + r.location.lng, 0) / reports.length;
    const earliest = reports.map((r) => r.createdAt).sort()[0];
    const latest = reports.map((r) => r.updatedAt).sort().reverse()[0];

    allIncidents.push({
      id: def.id,
      memberReportIds: reports.map((r) => r.id),
      reportCount: reports.length,
      mergedSummary: def.mergedSummary,
      rootCauseGuess: def.rootCauseGuess,
      priorityScore: def.priorityScore,
      priorityFactors: def.priorityFactors,
      leadDepartment: def.leadDepartment,
      supportingDepartments: def.supportingDepartments,
      location: { lat: avgLat, lng: avgLng },
      status: 'new',
      statusHistory: [
        {
          status: 'new',
          timestamp: earliest,
          actor: 'system',
          note: 'Incident created from clustered reports (synthetic seed data)',
        },
      ],
      verificationStatus: null,
      closureUnreliable: false,
      createdAt: earliest,
      updatedAt: latest,
      synthetic: true,
    });
  }

  // 4b. Standalone incidents
  let standaloneIdx = INCIDENT_DEFS.length + 1;
  for (const item of ungrouped) {
    const incId = `INC-${String(standaloneIdx).padStart(3, '0')}`;
    const report = hydrateReport(item, incId);
    allReports.push(report);

    const safetyRisk = report.fakeScore < 50
      ? (report.aiResult?.severityCues?.length ?? 0) >= 3 ? 0.7 : 0.3
      : 0.1;
    const adjustedSafety = item.safetyOverride ? 1.0 : safetyRisk;
    const nearSens = item.nearSensitive ? 1.0 : 0.0;
    const imageSev = report.imageUrl ? 0.4 : 0.2;

    const factors = {
      safetyRisk: adjustedSafety,
      peopleAffected: 0.1,
      imageSeverity: imageSev,
      age: 0.3,
      sensitiveLocation: nearSens,
      recurrenceHistory: 0.1,
    };

    const score = Math.round(
      factors.safetyRisk * 30 +
      factors.peopleAffected * 20 +
      factors.imageSeverity * 15 +
      factors.age * 10 +
      factors.sensitiveLocation * 15 +
      factors.recurrenceHistory * 10
    );

    allIncidents.push({
      id: incId,
      memberReportIds: [report.id],
      reportCount: 1,
      mergedSummary: report.aiResult?.summary ?? report.text,
      rootCauseGuess: null,
      priorityScore: score,
      priorityFactors: factors,
      leadDepartment: report.department,
      supportingDepartments: [],
      location: report.location,
      status: 'new',
      statusHistory: [
        {
          status: 'new',
          timestamp: report.createdAt,
          actor: 'system',
          note: 'Incident created from single report (synthetic seed data)',
        },
      ],
      verificationStatus: null,
      closureUnreliable: false,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      synthetic: true,
    });
    standaloneIdx++;
  }

  return { allReports, allIncidents };
}

function hydrateReport(input, incidentId) {
  const fakeSignals = {
    textImageMismatch: input.textImageMismatch || false,
    noSceneInImage: input.fakeReasons.some((r) => r.toLowerCase().includes('no scene')),
    rapidRepeatSubmission: input.fakeReasons.some((r) => r.toLowerCase().includes('rapid')),
    gibberishText: input.fakeReasons.some((r) => r.toLowerCase().includes('gibberish')),
    outOfServiceArea: input.fakeReasons.some((r) => r.toLowerCase().includes('service area')),
    reusedImageHash: input.fakeReasons.some((r) => r.toLowerCase().includes('image hash')),
  };

  const aiResult = {
    language: input.language,
    translatedText: input.translatedText,
    category: input.category,
    summary: input.summary,
    imageFindings: input.imageFindings,
    severityCues: input.severityCues || [],
    department: input.department,
    confidence: input.confidence,
    textImageMismatch: input.textImageMismatch || false,
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
    fakeReasons: input.fakeReasons || [],
    imageHash: input.imageHash,
    incidentId,
    status: 'new',
    statusHistory: [
      {
        status: 'new',
        timestamp: input.createdAt,
        actor: 'system',
        note: 'Report submitted (synthetic seed data)',
      },
    ],
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    synthetic: true,
  };
}

// ── 5. Firestore REST API Serializer ─────────────────────────────────
// Converts standard JS objects into Firestore REST document format
function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toFirestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    fields[k] = toFirestoreValue(v);
  }
  return fields;
}

// ── 6. Push to Firestore via REST ────────────────────────────────────
async function uploadDocument(collectionName, docId, data) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}/${docId}`;
  const body = JSON.stringify({ fields: toFirestoreFields(data) });

  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to write ${collectionName}/${docId} (${res.status}): ${errText}`);
  }
}

async function main() {
  console.log(`\n🌱 UrbanPulse Seed Script`);
  console.log(`📡 Target Firebase Project: ${projectId}`);

  const { allReports, allIncidents } = buildDataset();
  console.log(`📦 Prepared ${allReports.length} reports and ${allIncidents.length} incidents.`);
  console.log(`⏳ Uploading to Firestore...\n`);

  // Write reports with concurrency control (5 concurrent)
  let reportSuccess = 0;
  for (const report of allReports) {
    await uploadDocument('reports', report.id, report);
    reportSuccess++;
    process.stdout.write(`\r  Reports uploaded: ${reportSuccess}/${allReports.length}`);
  }
  console.log('\n  ✅ All reports uploaded.');

  // Write incidents
  let incSuccess = 0;
  for (const incident of allIncidents) {
    await uploadDocument('incidents', incident.id, incident);
    incSuccess++;
    process.stdout.write(`\r  Incidents uploaded: ${incSuccess}/${allIncidents.length}`);
  }
  console.log('\n  ✅ All incidents uploaded.');

  console.log(`\n🎉 Seed completed successfully!`);
  console.log(`   - 50 Reports in collection 'reports'`);
  console.log(`   - ${allIncidents.length} Incidents in collection 'incidents'`);
  console.log(`   - Single street cluster: 'sayyaji-rao-cluster' (7 reports, INC-001)`);
  console.log(`   - 3 urgent safety issues: INC-005 (open manhole), RPT-020 (live wire), RPT-021 (fallen tree)`);
  console.log(`   - 3 suspicious reports: RPT-022, RPT-023, RPT-024\n`);
}

main().catch((err) => {
  console.error('\n❌ Seed failed:', err.message);
  process.exit(1);
});

