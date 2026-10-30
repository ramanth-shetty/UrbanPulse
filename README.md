# UrbanPulse — AI Civic Complaint Platform

> **Transforming scattered citizen complaints into unified, prioritized, and verifiable civic action for Mysuru.**  
> *"Incidents, not tickets."*

UrbanPulse is an AI-powered municipal issue resolution platform built for the **Mysore City Corporation (MCC)**. Rather than treating every citizen complaint as an isolated ticket that overwhelms ward officers with duplicates and spam, UrbanPulse uses a multi-stage AI and deterministic clustering pipeline to merge corroborating reports into single root-cause incidents, calculate explainable priority scores, flag suspicious submissions for human review, and empower citizens to verify physical fixes on-site.

---

## 🌟 Key Capabilities

1. **Mobile-First Citizen Capture (`/report/new`):**
   - Completable in under 60 seconds with photo upload (Firebase Storage), interactive Leaflet map pin, GPS "Use My Location", manual address, and AI category auto-detection.
   - Accepts complaints in **Kannada, Hindi, and English**.
   - Handles edge cases like missing photos, slow connections, or low bandwidth.

2. **Multilingual Gemini Vision & Text Analysis (`/api/reports/[id]/analyze`):**
   - Extracts category, summary, severity cues, department, confidence, and detects text-image mismatches.
   - 3-tier resilient execution: Primary model (`gemini-1.5-flash`), retry with lighter model (`gemini-1.5-flash-8b`), and zero-network deterministic keyword fallback (`fallbackUsed: true`).

3. **Deterministic Priority Scoring (`src/lib/ai/priorityScoring.ts`):**
   - **Never scored by an LLM**: Uses a weighted formula combining Life/Safety Risk (30%), People Affected (25%), Sensitive Location proximity (15%), Visual Image Severity (15%), Unresolved Age (10%), and Recurrence History (5%).
   - Safety keyword overrides force **Critical (90/100)** for lethal hazards (live wires, open manholes, fallen trees on roadways) in Kannada, Hindi, and English.
   - Generates deterministic plain-language explanations without LLM hallucinations.

4. **Fake & Spam Detection with Human Triage (`src/lib/ai/fakeScoring.ts`):**
   - Detects text-image mismatches, non-civic photos, keystroke gibberish, rapid repeat spam bursts, out-of-service coordinates (outside Mysuru bounding box), and duplicate image hashes.
   - **Strict Policy:** High suspicion reports ($\ge 60/100$) are **never auto-rejected**; they are routed to the **Human Review Queue (`/admin/review`)** for admin approval, merging, or documented dismissal.

5. **Spatiotemporal Incident Linking (`src/lib/ai/incidentLinking.ts`):**
   - Links reports within 150 meters and 14 days based on domain relatedness (drainage + waterlogging + road damage) and keyword overlap.
   - Cross-category incidents identify lead and supporting departments and deduce root causes.

6. **City Operations Center & Map (`/admin`):**
   - Interactive Leaflet map with priority-colored pins and density hotspot heat layers.
   - Incident queue sorted by priority, department filtering, and summary counters.

7. **Incident Detail Dossier (`/admin/incidents/[id]`):**
   - Visual factor breakdown bars, "Why this ranks above [other incident]" ranking comparison, linked report photos, and dispatch workflow.

8. **Admin Workflow & Mocked Crew Dispatch:**
   - Full lifecycle: `New` &rarr; `Under review` &rarr; `Assigned` &rarr; `In progress` &rarr; `Resolved`.
   - Dispatch to realistic municipal crews (e.g. *MCC Drainage Quick-Response Crew #2*), writing an immutable audit trail (`StatusHistoryEntry`) at every transition.

9. **Citizen Tracking & Resolution Verification (`/track/[id]`):**
   - Displays: *"Linked to incident INC-XXXX, N others affected"*, assigned department, and status timeline.
   - When marked **Resolved**, prompts the citizen: **"Is it actually fixed?"**
   - **Yes:** Marks status as `Citizen-verified`.
   - **No:** Reopens the incident, flags the previous closure as **UNRELIABLE**, and automatically escalates priority (+20 pts).

10. **Department Morning Briefing (`/admin/brief`):**
    - Sends the top 3 deterministic incidents per department to Gemini to generate an action briefing: What to fix first, Why, Suggested crew grouping by location, and Risks.
    - **Score Integrity:** The LLM narrates only; priority scores remain strictly deterministic.
    - Browser print and PDF stylesheet with official MCC letterhead and Chief Ward Officer sign-off.

---

## 🏗️ Architecture & Tech Stack

```
UrbanPulse/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing page & complaint tracker search
│   │   ├── report/new/page.tsx         # Citizen 1-minute mobile reporting form
│   │   ├── track/[id]/page.tsx         # Citizen live tracking & verification view
│   │   ├── admin/
│   │   │   ├── page.tsx                # City Operations Center (Leaflet map + list)
│   │   │   ├── brief/page.tsx          # Department Morning Dispatch Brief (Print/PDF)
│   │   │   ├── review/page.tsx         # Human Review Queue for suspicious complaints
│   │   │   └── incidents/[id]/page.tsx # Incident Detail Dossier with factor breakdown
│   │   └── api/
│   │       ├── reports/route.ts        # POST new report, GET recent reports
│   │       ├── reports/[id]/route.ts   # GET report & parent incident tracking info
│   │       ├── reports/[id]/analyze/   # Multimodal Gemini report analysis route
│   │       ├── reports/[id]/verify/    # Citizen fix verification (Yes/No reopen)
│   │       ├── incidents/route.ts      # GET aggregated incidents with department filter
│   │       ├── incidents/[id]/route.ts # PATCH incident status & crew assignment
│   │       ├── admin/review-queue/     # GET flagged review queue reports
│   │       ├── admin/review-action/    # POST operator triage (approve/merge/reject)
│   │       ├── admin/morning-brief/    # GET cached AI-narrated morning briefing
│   │       └── seed/route.ts           # POST seed database loader endpoint
│   ├── components/
│   │   ├── LocationPicker.tsx          # Client-only Leaflet map pin selector
│   │   ├── ReportSuccess.tsx           # Submission receipt with tracking ID
│   │   └── admin/
│   │       ├── IncidentMap.tsx         # Operations map with priority markers & heat
│   │       ├── IncidentList.tsx        # Priority-sorted incident cards & alerts
│   │       ├── FactorBreakdownBars.tsx # Visual horizontal bars for priority factors
│   │       └── PriorityComparison.tsx  # "Why this ranks above" comparative analysis
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── priorityScoring.ts      # Pure deterministic priority scoring engine
│   │   │   ├── fakeScoring.ts          # Pure fake suspicion scoring engine
│   │   │   ├── incidentLinking.ts      # Spatiotemporal clustering & root cause engine
│   │   │   ├── analyzeReport.ts        # Gemini multimodal analysis orchestrator
│   │   │   ├── fallbackAnalysis.ts     # Zero-network keyword fallback analyzer
│   │   │   └── morningBrief.ts         # Morning brief generator (Gemini + template)
│   │   ├── firestore/                  # Firestore collection helpers
│   │   ├── mockedCrews.ts              # Department-specific Mysuru municipal field crews
│   │   └── fallbackData.ts             # In-memory seed cache for seamless local testing
│   ├── data/
│   │   └── seedReports.json            # 50 synthetic Mysuru complaints (KN, HI, EN)
│   └── types/                          # TypeScript schemas (Report, Incident, Status, AI)
```

- **Framework:** Next.js 15.1.0 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS with dedicated `@media print` stylesheets
- **Maps:** Leaflet & React-Leaflet with OpenStreetMap tiles (SSR disabled)
- **Database & Storage:** Firebase Firestore (v11.2.0) and Firebase Storage
- **AI Models:** Google Gemini 1.5 Flash (`gemini-1.5-flash`), Gemini 1.5 Flash-8b via REST API

---

## ⚡ Quickstart & Setup

### 1. Prerequisites
- Node.js 20+ (Node 24 recommended)
- A Google Gemini API key ([Google AI Studio](https://aistudio.google.com/))
- (Optional) Firebase project credentials for live cloud persistence

### 2. Installation
```bash
git clone https://github.com/your-username/UrbanPulse.git
cd UrbanPulse
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the project root:
```env
# Gemini API Key (Server-only, never exposed to browser)
GEMINI_API_KEY=your_gemini_api_key_here

# (Optional) Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```
> **Note:** If Firebase credentials are not provided, UrbanPulse automatically falls back to its built-in in-memory dataset of 50 synthetic Mysuru reports so all features work out-of-the-box.

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Seeding the 50 Synthetic Reports into Firestore
To seed live Firestore with the 50 synthetic reports (Kannada, Hindi, English across Mysuru landmarks):
```bash
npm run seed
```

---

## 🧪 Automated Testing & Verification

UrbanPulse includes standalone CLI test suites:

- **Run Scoring Tests (Priority Safety Overrides & Fake Signals):**
  ```bash
  node src/scripts/testScoring.mjs
  ```
- **Run Incident Linking & Cluster Aggregation:**
  ```bash
  node src/scripts/runIncidentLinking.mjs
  ```
- **Run Full End-to-End Demo Journey & Edge Case Audit:**
  ```bash
  node src/scripts/demoJourney.mjs
  ```
- **Typecheck & Production Build:**
  ```bash
  npx tsc --noEmit
  npm run build
  ```

---

## 🧭 Step-by-Step Demo Guide

| Phase | URL | Action to Observe |
|---|---|---|
| **1. Citizen Report** | `/report/new` | Pin location near Sayyaji Rao Rd. Enter text in Kannada or English without a photo. Submit and receive report ID. |
| **2. Operations Map** | `/admin` | Observe the Leaflet map: the report merges into an existing incident cluster with an elevated priority pin. |
| **3. Incident Dossier** | `/admin/incidents/[id]` | Inspect factor breakdown bars, "Why this ranks above" comparison, and root cause guess. |
| **4. Dispatch Workflow** | `/admin/incidents/[id]` | Select department and assign a mocked crew. Progress status to *Assigned* &rarr; *In Progress* &rarr; *Resolved*. |
| **5. Morning Brief** | `/admin/brief` | View the top 3 incidents narrated by Gemini. Click **Print / Save as PDF** to preview official letterhead. |
| **6. Review Queue** | `/admin/review` | Inspect suspicious reports (`RPT-022`, `RPT-023`). Execute *Approve*, *Merge*, or *Dismiss with Reason*. |
| **7. Citizen Verification**| `/track/[id]` | View "Linked to incident, N others affected". Under Resolved status, click **"No, Not Fixed"** &rarr; observe incident reopening with **+20 priority escalation** and closure marked **UNRELIABLE** in Admin. |

---

## 📜 License
MIT License. Created for the Mysore City Corporation (MCC) civic technology initiative.
