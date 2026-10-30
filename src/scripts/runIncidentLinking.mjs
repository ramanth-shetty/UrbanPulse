import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { linkReportToIncident, calculateDistanceMeters } from '../lib/ai/incidentLinking.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the 50 synthetic reports
const jsonPath = path.resolve(__dirname, '../data/seedReports.json');
const rawReports = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log('═══════════════════════════════════════════════════════════════');
console.log('🔄 RUNNING INCIDENT LINKING ON 50 SYNTHETIC CITIZEN REPORTS');
console.log('═══════════════════════════════════════════════════════════════\n');

const incidents = [];
const reportsMap = new Map();

// Populate reports map
for (const raw of rawReports) {
  const report = {
    ...raw,
    location: { lat: raw.lat, lng: raw.lng },
    translatedText: raw.translatedText || raw.text,
    summary: raw.summary || raw.text.slice(0, 80),
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
  };
  reportsMap.set(report.id, report);
}

// Sequentially process each report through incident linking
let linkCount = 0;
let newIncidentCount = 0;

for (const report of reportsMap.values()) {
  const { incident, isNewIncident, matchReasons } = linkReportToIncident(
    report,
    incidents,
    reportsMap
  );

  if (isNewIncident) {
    incidents.push(incident);
    newIncidentCount++;
  } else {
    // Update existing incident in place
    const idx = incidents.findIndex((i) => i.id === incident.id);
    if (idx !== -1) {
      incidents[idx] = incident;
    }
    linkCount++;
  }

  // Update report with linked incident ID
  report.incidentId = incident.id;
}

console.log(`📊 PROCESSING SUMMARY:`);
console.log(`   - Total Citizen Reports Ingested: ${rawReports.length}`);
console.log(`   - Resulting Root-Cause Incidents: ${incidents.length}`);
console.log(`   - Cross-Report Merges Detected: ${linkCount}`);
console.log(`   - Standalone Incidents Formed: ${incidents.filter((i) => i.reportCount === 1).length}\n`);

// ─────────────────────────────────────────────────────────────────────
// HIGHLIGHT: CROSS-CATEGORY & CLUSTERED INCIDENTS
// ─────────────────────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════════════════════════');
console.log('🌟 KEY INCIDENT CLUSTERS ("Incidents, Not Tickets")');
console.log('═══════════════════════════════════════════════════════════════\n');

// Sort by reportCount desc, then priorityScore desc
const sortedIncidents = [...incidents].sort((a, b) => b.reportCount - a.reportCount || b.priorityScore - a.priorityScore);

for (const inc of sortedIncidents) {
  if (inc.reportCount > 1 || inc.priorityScore >= 80) {
    console.log(`┌── 🚨 INCIDENT [${inc.id}] — Priority ${inc.priorityScore}/100 (${inc.reportCount} reports merged)`);
    console.log(`│   Centroid Location: ${inc.location.lat.toFixed(4)}, ${inc.location.lng.toFixed(4)}`);
    console.log(`│   Lead Department: ${inc.leadDepartment.toUpperCase()}`);
    if (inc.supportingDepartments.length > 0) {
      console.log(`│   Supporting Departments: ${inc.supportingDepartments.map((d) => d.toUpperCase()).join(', ')}`);
    }
    console.log(`│   Merged Reports: ${inc.memberReportIds.join(', ')}`);
    console.log(`│   Merged Summary: "${inc.mergedSummary.slice(0, 110)}..."`);
    if (inc.rootCauseGuess) {
      console.log(`│   🔍 Root Cause Guess: "${inc.rootCauseGuess}"`);
    }
    if (inc.matchReasons && inc.matchReasons.length > 0) {
      console.log(`│   🔗 Match Reasons:`);
      inc.matchReasons.forEach((r) => console.log(`│      • ${r}`));
    }
    console.log(`└──\n`);
  }
}

// Check Sayyaji Rao cluster specifically
const sayyajiReports = ['RPT-001', 'RPT-002', 'RPT-003', 'RPT-004', 'RPT-005', 'RPT-006', 'RPT-007'];
const sayyajiIncidents = new Set(sayyajiReports.map((id) => reportsMap.get(id)?.incidentId));

console.log('═══════════════════════════════════════════════════════════════');
console.log('🎯 SAYYAJI RAO ROAD CLUSTER VERIFICATION');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`Reports on street: RPT-001 through RPT-007 (Drain + Waterlogging + Road Damage)`);
console.log(`Linked into Incidents: ${Array.from(sayyajiIncidents).join(', ')}`);
if (sayyajiIncidents.size === 1) {
  const inc = incidents.find((i) => i.id === Array.from(sayyajiIncidents)[0]);
  console.log(`✅ SUCCESS: All 7 reports merged into single root-cause incident (${inc?.id})!`);
  console.log(`   Lead Dept: ${inc?.leadDepartment} | Supporting: ${inc?.supportingDepartments.join(', ')}`);
  console.log(`   Priority Score: ${inc?.priorityScore}/100`);
} else {
  console.log(`⚠️ Note: Distributed across ${sayyajiIncidents.size} incidents.`);
}
console.log('\n');

