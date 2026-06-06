# context/ai-workflow-rules.md
## LexFlow AI — Development Workflow, Scoping Rules & Delivery Approach

---

### Hackathon Development Philosophy

**Primary Rule:** Demo-first engineering. Every feature must be demonstrable in 2 minutes. If it can't be shown, it doesn't ship.

**Priority Order:**
1. **Core loop works end-to-end** (circular in → MAPs out → evidence in → vault entry)
2. **TrustVault SHA-256** (most unique technical feature — judges will ask about this)
3. **BehaviorGuard demo scenario** (most jaw-drop moment in the demo)
4. **LGD routing on map visual** (most visually impressive)
5. **Multilingual output** (strongest "real-world applicability" signal)

---

### Build Sequence (36-Hour Plan)

#### Phase 0: Setup (Hours 0–2)
- [ ] Create GitHub repo, project structure
- [ ] MongoDB Atlas cluster setup (free tier)
- [ ] FastAPI skeleton with health check endpoint
- [ ] Next.js 14 project with Tailwind
- [ ] Docker Compose with backend + frontend
- [ ] `.env` files configured

#### Phase 1: Data Layer (Hours 2–5)
- [ ] MongoDB collections setup (circulars, maps, evidence_vault, telemetry_logs, branches)
- [ ] Pydantic models for all entities
- [ ] LGD demo dataset seeded (Karnataka + Tamil Nadu, ~100 sample branches)
- [ ] Demo circular loaded (actual RBI Master Circular on IT security)
- [ ] Branch demo users created (compliance officer, 3 branch managers, 1 auditor)

#### Phase 2: LexGraph Pipeline (Hours 5–12)
- [ ] LangGraph state machine scaffold
- [ ] Extraction agent prompt (tested with actual RBI circular text)
- [ ] Validation agent + Pydantic schema enforcement
- [ ] Loop logic: incomplete MAPs → re-extract up to 3 times
- [ ] LGD routing logic
- [ ] Translation service (English → Kannada + Hindi minimum)
- [ ] `/api/v1/circulars/ingest` endpoint working end-to-end

#### Phase 3: TrustVault (Hours 12–16)
- [ ] SHA-256 file hashing service
- [ ] Append-only evidence collection enforced
- [ ] `/api/v1/evidence/upload` endpoint
- [ ] Hash verification endpoint
- [ ] Evidence vault schema with telemetry snapshot

#### Phase 4: BehaviorGuard (Hours 16–20)
- [ ] Frontend telemetry capture hooks (scroll, time, interactions)
- [ ] Telemetry log endpoint
- [ ] Risk scoring algorithm
- [ ] Quarantine logic (risk ≥ 0.6 → status = QUARANTINED)
- [ ] Frontend: silently prevents submission if quarantined (shows generic error)
- [ ] Risk queue in CO dashboard

#### Phase 5: Frontend (Hours 20–28)
- [ ] Sidebar layout + routing
- [ ] CO Dashboard: stats, compliance heatmap (react-simple-maps India)
- [ ] Circular ingestion page (drag-drop upload)
- [ ] MAP list + detail page
- [ ] Branch Manager portal: task list, evidence upload
- [ ] Evidence Vault page: hash display, verification
- [ ] Risk Review queue page

#### Phase 6: Integration & Demo Polish (Hours 28–34)
- [ ] End-to-end demo run: RBI circular → MAPs → branch assignment → evidence upload → behavioral flag → quarantine → legitimate re-submission → vault locked
- [ ] Seed compelling demo data (pre-loaded circulars, partial completions, one quarantined submission)
- [ ] README with demo script
- [ ] Video recording setup

#### Phase 7: Buffer + Submission (Hours 34–36)
- [ ] Bug fixes from demo run
- [ ] Submission checklist
- [ ] Deploy to cloud (Railway / Render / Vercel) or prepare localhost demo

---

### Scoping Rules

**When deciding whether to build something, ask:**

1. **Is it on the critical demo path?** → Build it properly
2. **Will judges ask how it works?** → Build it properly
3. **Is it a "trust signal" feature?** (security, crypto, data integrity) → Build it properly
4. **Is it purely visual / nice-to-have?** → Mock it
5. **Would a missing feature break the demo story?** → Build a convincing mock at minimum

**Explicitly Mock (don't build real):**
- Core banking API integration (show JSON payload as "ready to send")
- RBI website scraping (use pre-loaded circular)
- Production authentication (basic JWT is enough)
- Full India LGD dataset (Karnataka + Tamil Nadu subset is enough)
- Email/SMS notifications (show in UI as "notification sent")

---

### Demo Script (For Judges)

**Narrative:** "Today, somewhere in India, RBI issued a new circular mandating all banks update their TLS configuration. Watch what LexFlow does in the next 3 minutes..."

**Step 1 — Ingestion (30 sec)**
- Show Compliance Officer dashboard
- Drag-drop RBI circular PDF
- Show LangGraph "thinking" animation (extraction → validation loop → routing)
- MAPs appear: "3 MAPs generated, assigned to 847 branches"

**Step 2 — Branch Manager View (45 sec)**
- Switch to Branch Manager (Thrissur, Kerala)
- Shows task in Kannada: "SSL configuration update required"
- Manager opens task, glances for 4 seconds, immediately clicks "Submit"
- Upload dummy PDF
- System shows: "Submitting..." [pause] "Evidence Under Review"

**Step 3 — BehaviorGuard Reveal (30 sec)**
- Switch to CO dashboard
- Show: "New Risk Flag: Branch #2912345 — Reading Speed: 4 seconds for 8-page policy — Submission: 11:47 PM Saturday — Risk Score: 0.87 — Status: QUARANTINED"
- Explain: "The branch manager attempted tick-box compliance. Our system detected it silently."

**Step 4 — TrustVault (30 sec)**
- Show legitimate submission from another branch
- Evidence uploaded, SHA-256 displayed: `a3f2c8d1e9b47...`
- Click "Verify": re-hash in real time → match confirmed
- "This hash is mathematically impossible to forge retroactively"

**Step 5 — Dashboard Overview (15 sec)**
- Show India heatmap: 72% compliance, 3 quarantined branches (red), 847 branches in scope
- "This is what the RBI inspector sees on Day 1 of audit"

**Total demo: ~2.5 minutes + Q&A**

---

### Delivery Checklist

**Must have before submission:**
- [ ] GitHub repo with clean README
- [ ] Working demo (localhost or deployed)
- [ ] Demo data pre-seeded
- [ ] 2-minute demo video
- [ ] Architecture diagram in README
- [ ] All 4 evaluation criteria addressed in README
- [ ] Tech stack documented
- [ ] Sovereign AI / DPDP Act compliance noted

**Presentation must include:**
- [ ] Live demo (not slides only)
- [ ] BehaviorGuard demo scenario (most memorable moment)
- [ ] SHA-256 hash verification (show it live)
- [ ] India map with compliance heatmap
- [ ] Multilingual MAP (show Kannada translation)

---

### Code Quality Thresholds for Hackathon

- **No crashes during demo.** Handle errors gracefully, show friendly messages.
- **Seed data covers all demo scenarios.** Don't live-generate risky parts.
- **API response time < 2 seconds** for all non-AI endpoints (cache if needed).
- **LLM calls have timeout + fallback.** If Sarvam API is slow, use pre-cached response.
- **Mobile-responsive optional.** Desktop-only is fine for hackathon.
