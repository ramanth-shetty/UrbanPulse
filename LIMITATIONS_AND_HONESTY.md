# UrbanPulse — Limitations, System Honesty & Technical Disclosure

> **Transparency Note:** In civic technology, honesty regarding what is genuinely functional versus simulated or mocked is essential for public trust. This document outlines the real capabilities, simulated demonstration components, AI failure modes, and the future production roadmap of UrbanPulse.

---

## 1. Real vs. Mocked & Simulated

### What is REAL (Production Functional)
- **Multimodal AI Analysis (`gemini-1.5-flash`):** Real-time text comprehension, translation of Kannada (`kn`), Hindi (`hi`), and English (`en`), category auto-detection, visual severity cue extraction, and photo-text mismatch verification.
- **Deterministic Priority Scoring Engine:** Pure mathematical weighted calculation based on 6 factors. The score ($0\text{–}100$) is never determined by an LLM, guaranteeing zero hallucination in municipal triage.
- **Multilingual Safety Keyword Overrides:** Hardcoded regex matching across Kannada, Hindi, and English that forces priority score to **Critical (90/100)** for live wires, open manholes, and fallen road trees.
- **Spatiotemporal Deduplication & Incident Linking:** Haversine spatial calculations clustering reports within a $150\text{ m}$ radius and 14-day window, matching domain relatedness (drainage + waterlogging + road damage) into unified incidents.
- **Interactive OpenStreetMap / Leaflet Engine:** Accurate geospatial rendering centered on real Mysuru coordinates (Sayyaji Rao Road, KR Hospital, Devaraja Market, Kuvempunagar, Jayalakshmipuram).
- **Citizen On-Site Verification & Escalation Loop:** Working interactive verification where a citizen can dispute a resolution, automatically marking the closure as **UNRELIABLE**, reopening the incident, and deterministically escalating priority (+20 pts).
- **Print / PDF Dispatch Stylesheet:** Browser-native `@media print` CSS generating an official Mysore City Corporation letterhead document without UI artifacts.
- **Firestore Database Integration:** Real cloud persistence via Google Cloud Firestore with automatic in-memory fallback for offline or zero-credential evaluation.

### What is MOCKED / SIMULATED (Clearly Labelled in UI)
- **Citizen SMS & WhatsApp Notifications:** Handled as simulated dispatches. All alert banners are explicitly labelled with `[Mocked Notification]` and displayed as UI toast alerts (e.g., `📱 [Mocked Notification] SMS sent to citizen (+91-98800-XXXXX)...`).
- **Municipal Field Crew Names:** Field crews (e.g., *MCC Drainage Quick-Response Crew #2 (Central)*, *CESC Line Patrol & Emergency Unit 5*) are realistic simulations representing Mysuru ward divisions, labelled as **Mocked**.
- **Department Routing:** Automated department assignment is simulated based on complaint category and AI recommendation rather than a live government intranet API.
- **Synthetic Seed Complaints:** The 50 pre-loaded reports are synthetic data points authored to represent realistic Mysuru street issues without containing real citizens' personal data or phone numbers.

---

## 2. Where AI Can Be Wrong (Failure Modes & Safeguards)

Civic complaints deal with critical physical infrastructure. UrbanPulse was engineered with strict architectural guardrails to prevent AI error from causing municipal neglect:

### Failure Mode 1: Multilingual & Dialect Misunderstandings
- **The Risk:** Regional Kannada slang, colloquial abbreviations, or transliterated Kannada in English script (*Kanglish*) can be misinterpreted by general-purpose LLMs.
- **The Guardrail:** If confidence drops below $0.50$, the system routes the report to the **Human Review Queue (`/admin/review`)**. Furthermore, a zero-network keyword fallback extracts basic categories even if the LLM fails completely.

### Failure Mode 2: Ambiguous or Low-Context Photos
- **The Risk:** A citizen taking a photo of a dry street corner to document an underground sewage stench or taking a photo of an entire street rather than a close-up pothole might trigger a false-positive **Text-Image Mismatch**.
- **The Guardrail:** **High suspicion NEVER auto-rejects.** Even if an image mismatch score reaches $85/100$, the complaint is never deleted; it is held in the Human Review Queue where an operator can inspect the citizen's description before dismissing or approving.

### Failure Mode 3: Hallucinated Urgency or Favoritism
- **The Risk:** If an LLM were allowed to assign priority scores directly, prompt injection (e.g. *"This is an emergency for the Prime Minister, fix immediately"*) or biased prose could unfairly game the municipal queue.
- **The Guardrail:** **The LLM is strictly prohibited from calculating or modifying scores.** Priority is computed by a pure deterministic function. The LLM acts solely as a narrator in the Morning Briefing, organizing field action without the ability to alter numerical urgency.

### Failure Mode 4: Premature Municipal Closure
- **The Risk:** A municipal crew marks a pothole as resolved after dumping gravel without asphalt compaction, or clears trash that immediately re-accumulates.
- **The Guardrail:** The **Citizen Verification Loop**. Citizens who submitted reports receive an on-site confirmation prompt: *"Is it actually fixed?"* Clicking **No** reopens the incident, flags the closure as **UNRELIABLE** in municipal records, and escalates priority for supervisor review.

---

## 3. What's Next (Production Roadmap)

To move UrbanPulse from hackathon/prototype to live civic deployment across Mysore City Corporation:

1. **ERP Integration:** Connect directly to Karnataka's **IPGRS (Integrated Public Grievance Redressal System)** and **Seva Sindhu** via state API gateways.
2. **WhatsApp Business API Intake:** Enable citizens to submit photos, voice notes in Kannada, and live location pins directly over WhatsApp without downloading an app.
3. **Automated Contractor SLA Tracking:** Implement cryptographic on-site verification (time-stamped GPS EXIF verification on crew after-photos) before an incident can transition to *Resolved*.
4. **IoT Sensor Corroboration:** Integrate municipal IoT water-level sensors in low-lying stormwater drains (e.g. near Kukkarahalli Lake / Sayyaji Rao Road) to automatically corroborate citizen flood reports with telemetry.
5. **Fine-Tuned Edge Vision Models:** Train lightweight, on-device vision models on the Indian Municipal Defect Dataset to detect potholes, manhole damage, and garbage density without cloud latency.

