# context/ui-context.md
## LexFlow AI — UI Design System

---

### Brand Identity

**Product Name:** LexFlow AI
**Tagline:** "From Legal Text to Actionable Flow — Seamlessly."
**Visual Personality:** Institutional authority meets modern clarity. Not fintech-flashy. Trustworthy, precise, government-grade reliability with modern UX sensibility.

---

### Color Palette

```css
/* Primary — Canara Bank Blue (institutional trust) */
--color-primary-900: #0A1628;
--color-primary-800: #0D1F3C;
--color-primary-700: #112952;
--color-primary-600: #1A3A6B;  /* Primary brand */
--color-primary-500: #2451A0;
--color-primary-400: #3A6DC7;
--color-primary-300: #6B9BD8;
--color-primary-200: #A8C4EC;
--color-primary-100: #D4E3F7;
--color-primary-50:  #EBF2FC;

/* Accent — Action/Compliance Green */
--color-success-700: #0A5C3A;
--color-success-600: #0D7A4E;
--color-success-500: #10A868;  /* Verified/complete */
--color-success-400: #34C47E;
--color-success-100: #D0F2E3;

/* Warning — Behavioral Risk Amber */
--color-warning-700: #7A3A00;
--color-warning-600: #A35000;
--color-warning-500: #D46A00;  /* Flagged */
--color-warning-400: #F08A2A;
--color-warning-100: #FEF0D9;

/* Danger — Quarantine/Overdue Red */
--color-danger-700: #6B0A0A;
--color-danger-600: #921010;
--color-danger-500: #C41515;  /* Quarantined */
--color-danger-400: #E53535;
--color-danger-100: #FDEAEA;

/* Neutral */
--color-neutral-950: #0A0A0A;
--color-neutral-900: #1A1A1A;
--color-neutral-800: #2D2D2D;
--color-neutral-700: #404040;
--color-neutral-600: #595959;
--color-neutral-500: #737373;
--color-neutral-400: #9A9A9A;
--color-neutral-300: #BDBDBD;
--color-neutral-200: #D9D9D9;
--color-neutral-100: #F0F0F0;
--color-neutral-50:  #FAFAFA;

/* Backgrounds */
--color-bg-primary:   #F4F6FB;  /* Main app background */
--color-bg-secondary: #FFFFFF;  /* Card/panel background */
--color-bg-sidebar:   #0D1F3C;  /* Dark sidebar */
```

---

### Typography

```css
/* Headings — institutional, legible */
--font-heading: 'Inter', 'Segoe UI', system-ui, sans-serif;

/* Body — clean, readable at small sizes */
--font-body: 'Inter', 'Segoe UI', system-ui, sans-serif;

/* Monospace — for hashes, codes, API payloads */
--font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;

/* Scale */
--text-xs:   0.75rem;   /* 12px — metadata, timestamps */
--text-sm:   0.875rem;  /* 14px — secondary text */
--text-base: 1rem;      /* 16px — body */
--text-lg:   1.125rem;  /* 18px — card titles */
--text-xl:   1.25rem;   /* 20px — section headers */
--text-2xl:  1.5rem;    /* 24px — page titles */
--text-3xl:  1.875rem;  /* 30px — dashboard numbers */
--text-4xl:  2.25rem;   /* 36px — hero stats */
```

---

### Component Conventions

#### Status Badges
```
PENDING      → gray pill     (#737373 bg, white text)
IN_PROGRESS  → blue pill     (#2451A0 bg, white text)
SUBMITTED    → amber pill    (#D46A00 bg, white text)
VERIFIED     → green pill    (#10A868 bg, white text)
QUARANTINED  → red pill      (#C41515 bg, white text)
OVERDUE      → dark red pill (#921010 bg, white text)

SentinelVision Forensics Badges:
CLEAN            → green badge   (#E6F4EA bg, #137333 text)
SUSPICIOUS       → orange badge  (#FEF7E0 bg, #B06000 text)
LIKELY_TAMPERED  → red badge     (#FCE8E6 bg, #C5221F text, animated pulse)

```

#### Risk Score Indicator
```
0.0 – 0.29   → Green shield icon    "Low Risk"
0.30 – 0.59  → Amber shield icon   "Flagged - Review"
0.60 – 1.0   → Red shield icon     "HIGH RISK - Quarantined"
```

#### Evidence Card
```
┌─────────────────────────────────────────────┐
│ 📄 policy_update_v2.pdf          [ACCEPTED] │
│                                             │
│ SHA-256: a3f2c8d1e9b4...7f2a1c             │
│ Uploaded: 14 Jun 2025, 10:32 AM IST         │
│ By: Priya Nair (Branch: 2912345 - Thrissur)│
│ Risk Score: ●●○○○ 0.12 (Low)               │
│                                             │
│ [Verify Hash] [Download] [View Telemetry]   │
└─────────────────────────────────────────────┘
```

#### MAP Card
```
┌─────────────────────────────────────────────┐
│ MAP-2025-0047                   [IN_PROGRESS]│
│ Update TLS Configuration to v1.3            │
│                                             │
│ Department: IT Operations                   │
│ KPI: All internet-facing endpoints use TLS  │
│      1.3 as verified by security scan       │
│ Deadline: ████████████░░░░ 12 days left     │
│                                             │
│ Assigned: 847 branches | 342 completed      │
│ Evidence: Log file required                 │
│                                             │
│ [View Details] [Translation: ಕನ್ನಡ]         │
└─────────────────────────────────────────────┘

#### Anticipatory MAP Blueprint Card (LexFlow Horizon)
- Rendered with a **dashed border** (`border-dashed border-2 border-amber-300`)
- Includes an amber "Anticipatory" icon/badge next to the ID Ref
- Displays warning banner: *"Anticipatory Blueprint Mode: This action point was generated proactively via LexFlow Horizon scanning. It is advisory for risk pre-mitigation and policy drafting — not a binding RBI circular instruction."*

#### ContinuumGuard ComplianceDriftStrip Component
- Evaluates live telemetry values against Rego constraints.
- Shows historical telemetry log rows with status (PASS/FAIL) and timestamp.
- Highlighted red alert boxes for active drifts with an "Acknowledge Drift" button for compliance officers.

```

---

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│ SIDEBAR (240px, dark)        │ MAIN CONTENT             │
│                              │                           │
│ LexFlow AI [logo]            │ ┌──────────────────────┐  │
│                              │ │ HEADER BAR           │  │
│ ● Dashboard                  │ │ Page Title + Actions │  │
│ ○ Circulars                  │ └──────────────────────┘  │
│ ○ MAPs                       │                           │
│ ○ Evidence Vault             │ ┌────┐ ┌────┐ ┌────┐ ┌──┐│
│ ○ Risk Review                │ │STAT│ │STAT│ │STAT│ │ST ││
│ ○ Branches                   │ └────┘ └────┘ └────┘ └──┘│
│ ○ Reports                    │                           │
│                              │ ┌──────────────┐ ┌──────┐│
│ ─────────────                │ │ India MAP    │ │ALERTS││
│                              │ │ (compliance  │ │PANEL ││
│ Role: Compliance Officer     │ │  heatmap)    │ │      ││
│ Arjun Mehta                  │ └──────────────┘ └──────┘│
│ [Logout]                     │                           │
└─────────────────────────────────────────────────────────┘
```

---

### UI Pages & Routes

| Route | Component | Access |
|---|---|---|
| `/` | Landing / Login | Public |
| `/dashboard` | Executive Overview | COMPLIANCE_OFFICER, REGIONAL_HEAD |
| `/circulars` | Circular List | COMPLIANCE_OFFICER |
| `/circulars/new` | Ingest Circular | COMPLIANCE_OFFICER |
| `/circulars/[id]` | Circular Detail + MAPs | COMPLIANCE_OFFICER |
| `/maps` | MAP List (filterable) | COMPLIANCE_OFFICER, REGIONAL_HEAD |
| `/maps/[id]` | MAP Detail (with Drift tab)| All roles |
| `/branch` | Branch Dashboard | BRANCH_MANAGER |
| `/branch/[lgd]/maps` | Branch MAP list | BRANCH_MANAGER |
| `/branch/[lgd]/submit/[map_id]` | Evidence Submission | BRANCH_MANAGER |
| `/vault` | Evidence Vault + Forensics| AUDITOR, COMPLIANCE_OFFICER |
| `/vault/verify` | Hash Verification | AUDITOR |
| `/risk-review` | Behavioral Risk Queue | COMPLIANCE_OFFICER |
| `/it/maps` | IT Remediation View | IT_ENGINEER |
| `/horizon` | Horizon Foresight Scanner | COMPLIANCE_OFFICER, REGIONAL_HEAD |


---

### Key UX Principles

1. **Branch managers need zero learning curve.** Branch Portal must be visually simple. Show 3 things: pending tasks, deadline, what to upload. That's it.

2. **Telemetry is invisible.** No UI element should hint to branch managers that their behavior is tracked.

3. **Hash display should feel authoritative.** Show SHA-256 hashes prominently in Evidence Vault. Monospace font. Copyable. Feels like a government document.

4. **Risk flags use color + icon + text.** Never rely on color alone (accessibility).

5. **Multilingual content is clearly labeled.** Show language selector. Include "Translated by BharatGen AI" attribution.

6. **Dashboard stats must update in near-real-time.** Use WebSocket or 30-second polling.

---

### Tailwind Config Extensions

```js
// tailwind.config.js additions
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: { 50: '#EBF2FC', 100: '#D4E3F7', ..., 900: '#0A1628' },
        brand: '#1A3A6B',
        vault: '#0A5C3A',    // TrustVault green
        risk: '#C41515',     // BehaviorGuard red
        flag: '#D46A00',     // Warning amber
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
}
```
