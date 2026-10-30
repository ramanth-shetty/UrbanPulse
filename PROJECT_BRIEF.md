# UrbanPulse – Project Brief

## Goal

Turn scattered citizen reports into prioritized, explainable, trackable action.

**Core idea:** "Incidents, not tickets" — many reports (including duplicates and different categories on the same street) merge into one root-cause incident.

## Lifecycle

**Capture → Understand → Reveal → Act**

## Users

| Role    | Capabilities                                                      |
| ------- | ----------------------------------------------------------------- |
| Citizen | Submit report, track by report ID, confirm fix                    |
| Admin   | Map view, incidents list, review queue, assign, morning brief     |

## Capture

- Text and/or photo, category selection, location (map pin or "use my location").
- Reports accepted in **English, Kannada, or Hindi**.
- Must take **under a minute** on a phone.

## Understand (Server Pipeline per Report)

1. **Single Gemini call** (text + image) returns JSON:
   - language, translated text, category, summary, image findings, severity cues, department, confidence, text-image mismatch flag.
2. **Safety keyword overrides** (rule-based):
   - e.g. "live wire" → critical severity.
3. **Fake/spam suspicion score** with reasons:
   - Text-image mismatch, no scene in image, rapid repeat submissions, gibberish text, out of service area, reused image hash.
   - **Never auto-reject.** High score → human review queue.
4. **Duplicate/cluster detection:**
   - Distance (~150 m radius) + text similarity + category relatedness (e.g. drain, waterlogging, road damage are related).
   - Within a configurable time window.
   - Link to an existing incident or create a new one.
5. **Deterministic priority score** with factor breakdown:
   - Safety risk, people affected (report count), image severity, age of report, sensitive location nearby (school/hospital), recurrence history.
6. **Department routing:**
   - Departments: Water/Drainage, Roads, Sanitation, Electricity, Parks, Traffic.
   - Rule-based from category; LLM as tiebreaker.
   - Cross-category incidents get a lead department + supporting departments.
   - **Label as simulated.**

## Reveal

- **Leaflet map** with colored pins (by priority/status).
- Hotspot layer (cluster density).
- Incident list with filters.
- Department filter.
- **"Why #1 over #2"** priority comparison explainer.
- Per-department **AI morning brief** with print / save-as-PDF.

## Act

- **Status flow:** New → Under Review → Assigned → In Progress → Resolved → Citizen-Verified.
- **Citizen tracking page:** timeline view, "X others affected" count.
- After resolution, citizen is asked **"Is it actually fixed?"**
  - Answering **No** reopens the incident and flags the closure as unreliable.

## Data

- Firestore collections: `reports` and `incidents`.
- **Synthetic data only**, using Mysuru street names.
- **No personal data.**

## Fallbacks

- Gemini can be overloaded (429 / 503).
- Strategy: retry → lighter model → rule-based fallback.
- Pre-process seeded data so the demo is never blocked by API availability.

## Demo Script (5 min)

1. Submit a report on a seeded cluster street.
2. Show AI output and reasoning.
3. Report merges into an existing incident; hotspot grows.
4. Open the morning brief.
5. Assign the incident and move status forward.
6. Citizen view shows the update.
7. Citizen verifies the fix.

## Deliverables

- Working prototype.
- README: setup instructions, architecture overview, AI approach.
- **Limitations & Honesty note:** what is real vs. mocked, where AI can be wrong, next steps.

