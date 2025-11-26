# 🧠 GRWO Product Blueprint

---
## 1. Executive Summary
GRWO is a vertically focused Real Estate Growth & Intelligence Platform. It fuses operational CRM, asset catalog management, revenue analytics, scheduling, omni‑channel reach, and an AI cognition layer ("Grwo AI Cortex") into a single, founder‑grade system. The product minimizes tooling fragmentation while surfacing actionable deal, inventory, and performance insights in real‑time.

**Core Value Pillars:**
- ⚡ Velocity: Rapid lead qualification, deal closure acceleration, and instant trend awareness.
- 🔍 Transparency: Unified pipeline visibility (Customer → Engagement → Property → Closure).
- 🤖 Intelligence: Natural language → Secure MongoDB query translation + narrative insights.
- 📊 Precision: Real‑time, code‑level analytics without stale pre‑aggregations.
- 🧩 Extensibility: Modular service & schema design enables feature addition without rewrites.

---
## 2. Target Personas & Use Cases
| Persona | Primary Goals | Key Modules | Success Metrics |
|---------|---------------|------------|-----------------|
| Brokerage Founder | Pipeline oversight, revenue forecasting | Dashboard, Analytics | MoM revenue growth, deal cycle compression |
| Senior Agent | Lead nurturing & conversion | Customers, Calendar, Reach | Qualified → Closed conversion rate |
| Inventory Manager | Asset lifecycle & valuation tracking | Properties | Listing freshness, average response time |
| Growth Analyst | Data interrogation & hypothesis validation | Grwo AI, Analytics | Query speed, actionable insights per session |
| Marketing Ops | Outreach orchestration & personalization | Reach | Open/reply rates |

---
## 3. Product Modules Overview
| Module | Purpose | Strategic Impact | Tech Surfaces |
|--------|---------|------------------|---------------|
| Dashboard | Executive snapshot of live KPIs | Speeds decision cadence | Chart.js, GSAP, REST aggregation |
| Properties | Asset catalog & transactional linkage | Drives inventory trust & discovery | Multer upload, MongoDB indexing |
| Customers (Client Intelligence) | Lead & client profiling | Increases conversion literacy | Dynamic card/list render, Notes engine |
| Customer Directory | Archived / Closed customers view | Historical deal validation | Read-only projection |
| Calendar / Tasks | Time-bound activity scheduling | Reduces missed engagements | Task schema queries |
| Reach | Email dispatch linked to CRM | Pipeline activation | Nodemailer + firm branding |
| Analytics | Dynamic KPI, funnel, call intelligence | Operational optimization | Client-side computed, live fetch |
| Grwo AI Cortex | NL → Query + Chat guidance | Data democratization & strategic clarity | Gemini 2.5 Flash Lite, secure sanitization |

---
## 4. High-Level Architecture
```
+----------------------+        +---------------------+
|      Frontend        |  -->   |  Express API Layer  |  --> MongoDB (Primary Store)
|  (HTML/CSS/JS, SPA)  |        |  /api/* REST        |       Collections: Customer, Property, Task, User
+----------+-----------+        +----------+----------+        +---------------------+
           |                                 |                       |
           | Web Requests / Fetch            | Mongoose ORM          |
           v                                 v                       v
   Client Aggregations                CRUD / Validation         Indexed Queries
           |                                 |                       |
           |       +-------------------------------+                  |
           |       |     AI Module (/api/ai)       |<-- Gemini API ---+
           |       |  NL Parsing & Query Planning  |
           |       +-------------------------------+
           |
           +--> Real-time narrative & structured results
```
**Key Traits:** Stateless REST, client-side analytics assembly, secure AI query generation (sanitized, read-only), and explicit file-system backed image storage.

---
## 5. Technology Stack
| Layer | Technology | Rationale |
|-------|------------|-----------|
| Runtime | Node.js (Express) | Familiar, lightweight HTTP surface, fast iteration |
| Database | MongoDB (Mongoose ODM) | Flexible schema evolution for CRM + inventory |
| Frontend | Vanilla HTML + Bootstrap + GSAP + Chart.js | Rapid prototyping + performance + reduced framework overhead |
| AI | Google Gemini 2.5 Flash Lite | Cost-efficient, latency-optimized reasoning + structured JSON output |
| Messaging | Nodemailer (Gmail App Password) | Simple transactional outreach MVP |
| Auth | Bcrypt (hashed credentials) | Secure credential handling foundation |
| File Uploads | Multer (Disk storage + /uploads static serve) | Predictable handling, migration-ready to object storage |
| Environment | dotenv | Deployment configuration isolation |

---
## 6. Data Model Deep Dive
### 6.1 Customer
```
Customer: {
  custId: String (unique 4-digit),
  name, phone, email,
  dealType: ['Buy','Rent','JV','Investment','Consultation'],
  req, description,
  bhk, typology, propertyTypes: [String],
  budget: Number,
  status: ['New','Interested','Closed'],
  notes: [{ type ('call'|'meeting'|'follow-up'|'general'), text, followUpDate, createdAt }],
  timestamps: createdAt, updatedAt
}
```
- 🔐 Duplicate prevention: pre-save phone uniqueness enforcement.
- 🆔 ID Generation: Controlled random 4-digit with collision retry.
- 📌 Notes drive call & follow-up intelligence.

### 6.2 Property
```
Property: {
  title, type, status: ['Sale','Rent','Lease','JV'],
  price, location,
  sqft, carpetArea, builtUpArea,
  floorDetails: { unitConfiguration, floorNumber, totalFloors, facing, parkingSlots },
  amenities: [String], images: ['/uploads/...'],
  description,
  customerCustId (optional linkage),
  closedDate, createdAt
}
```
- 🖼 Image handling: up to 10 images, MIME enforced.
- 🔍 Indexes: compound (type,status,price), text (title, description, location), customer linkage.
- 🧪 Flexible floorDetails for residential specificity.

### 6.3 Task
```
Task: { title, type: ['Client Meeting','Site Visit','Internal Review','Call','Follow-Up','Other'], date, description, customerCustId, createdAt }
```
- ⏰ Scheduling engine powering Calendar + site visit attendance metrics.

### 6.4 User
```
User: { fullName, firmName, email (unique), password (bcrypt), createdAt }
```
- 🚪 Authentication foundation (Session/JWT extension ready).

### 6.5 Derived Intelligence Entities
- Call metrics: Derived from `Customer.notes` filtered by `type === 'call'`.
- Funnel stages: Aggregated from `Customer.status`, `Task.type`, and closure events.

---
## 7. API Surface & Contract Overview
Base URL: `/api`

| Endpoint | Method | Purpose | Notes |
|----------|--------|---------|-------|
| `/health` | GET | Service liveness | Lightweight ping |
| `/register` | POST | User signup | Returns sanitized user object |
| `/login` | POST | Credential auth | Plain response (no JWT yet) |
| `/customers` | GET | List all customers | Sorted by `createdAt` desc |
| `/customers` | POST | Create customer | Handles array / comma-sep propertyTypes |
| `/customers/:custId` | GET | Single view | 404 if missing |
| `/customers/:custId` | PUT | Update | Partial patch semantics |
| `/customers/:custId` | DELETE | Remove customer | Hard delete |
| `/customers/:custId/notes` | POST | Add note | Adds follow-up or interaction |
| `/customers/:custId/notes` | GET | List notes | Returns embedded notes |
| `/customers/followups/upcoming` | GET | Cross-customer next actions | Sorted nearest first |
| `/properties` | GET | Filtered listing | Supports text search, type/status/price range |
| `/properties` | POST | Create with image upload | Enforces min required fields + image presence |
| `/properties/:id` | PUT | Update property | Add/replace images, enforce limit |
| `/properties/:id` | GET | Single | Lean retrieval |
| `/properties/:id` | DELETE | Delete asset | Frees document only (images remain if not purged) |
| `/tasks` | GET | Optional date range | Query params `from`,`to` |
| `/tasks` | POST | Create | Validates title/date |
| `/tasks/:id` | PUT | Update | Converts date to Date object |
| `/tasks/:id` | DELETE | Delete | |
| `/reach/send-email` | POST | Email customer | Requires `custId`, Gmail env configured |
| `/ai/nl-query` | POST | NL → Mongo query result | Read-only enforced, optional narrative |
| `/ai/chat` | POST | Strategic conversation | Markdown output |
| `/leads` | GET/POST | Legacy alias for customers | Transitional backwards compatibility |

**Safety Controls (AI):** Query operation restricted to `find` with validated operator whitelist, depth control, and JSON parsing guard. Count requests flagged via `meta.countOnly`.

---
## 8. Frontend Application (Page-by-Page)
| Page | Role | Data Sources | Key Interactions | Intelligence Layer |
|------|------|--------------|------------------|--------------------|
| `index.html` | Authentication gateway | `/api/register`, `/api/login` | Form submission, localStorage persistence | N/A |
| `dashboard.html` | Executive snapshot | `/api/customers`, `/api/properties`, `/api/tasks` | Tab router, property add, deletion | Revenue projection aggregation |
| `properties.html` | Asset management | `/api/properties` | Filtering, sorting, image upload | Price distribution usable for future valuation model |
| `customers.html` | Active lead CRM | `/api/customers`, notes POST | Grid/List toggle, add/edit/delete, notes, close deal → property creation | Follow-up badge computation |
| `customerdirectory.html` | Closed archive | `/api/customers` (status Closed) | Passive browsing | Historical conversion audit |
| `calender_tasks.html` | Activity scheduling | `/api/tasks` | Add/edit/delete tasks | Site visit attendance metric |
| `reach.html` | Outreach dispatch | `/api/reach/send-email` | Template selection, manual trigger | Potential enrichment via AI (future) |
| `analytics.html` | Performance intelligence hub | `/api/customers`, `/api/properties`, `/api/tasks` | Dynamic KPI animation, funnel, call parsing, lead source | Multi-source live computation (no static cache) |
| `grwoai.html` | AI Cortex interaction | `/api/ai/*` | Mode switch (Query/Chat), NL prompts, query reveal/hide, result table | NL→Mongo planner + narrative summarizer |

**Animation & UX Standards:**
- GSAP entrance with `killTweensOf` + `fromTo` to prevent cumulative fade stacking.
- Skeleton shimmer pre-render for funnel panel replaced with dynamic bars.
- Responsive currency formatting (INR Lakhs/Crores) for executive readability.

---
## 9. Key Data Flows
### 9.1 Lead Lifecycle
```
User Input (Add Customer) --> /api/customers (create) --> Customer stored --> Notes added over time --> Status transitions ('New'→'Interested'→'Closed') --> Property optionally created on closure --> Revenue + Funnel metrics reflect closure
```
### 9.2 Follow-Up Intelligence
```
Customer.notes (with followUpDate) --> /customers/followups/upcoming aggregation --> Calendar / CRM badges --> Agent prioritization
```
### 9.3 AI Query Execution
```
Prompt ("Top 5 customers by budget") --> /api/ai/nl-query --> Gemini model: JSON plan --> Sanitization (operator whitelist, depth) --> Mongo find() lean() --> Results + (optional) Narrative --> UI query block + Markdown summary --> Action planning by user
```
### 9.4 Property Creation
```
Form + Images --> Multer disk write --> Paths persisted in Property document --> /uploads served statically --> Visible in Properties & Dashboard revenue aggregation
```
### 9.5 Analytics Pipeline Assembly
```
Parallel Fetch (customers, properties, tasks) --> Client aggregation: revenue, deals, site visits, enquiries, calls, funnel --> Chart.js render + GSAP animate --> User exports / decisions
```

---
## 10. AI Module (Grwo AI Cortex)
**Objectives:** Democratize data interrogation; compress time-to-insight; enable narrative framing.

| Capability | Mechanism | Guardrail |
|------------|-----------|-----------|
| NL → Mongo Query | Prompt + Schema Spec → Gemini structured JSON | Enforced `find` only, operator whitelist |
| Result Narration | Preview results + prompt context → summarizer | Max 50 rows, avoids hallucination claims |
| Strategic Chat | Context-free or optional context prompt | Advises; no direct DB mutation |
| Query Panel Toggle | Mode gating | Hidden in Chat mode to reduce cognitive clutter |

**Sanitization Steps:**
1. JSON substring extraction (brace boundary).  
2. Parse & structural validation.  
3. Recursive filter cleaning (`sanitizeFilter`) with depth cap (≤5).  
4. Limit enforcement (1–200, default 50).  
5. Read-only execution via `.lean()`.

**Failure Modes & Handling:**
- Non-JSON output → 500 error (model fallback guideline).  
- Disallowed operators → 400 with explanatory message.  
- Empty results → Suggest next query (narrative path).  

---
## 11. Analytics & Intelligence Layer
| Metric | Source Logic | Notes |
|--------|--------------|-------|
| Total Revenue | Sum of `price` for `closedDate` properties; fallback linked → inventory total | Expressed in Crores if large |
| Deals Closed | Count of `Customer.status === 'Closed'` | Weekly trend vs previous 7d |
| Site Visit Attendance | Tasks where `type==='Site Visit'` and date <= now / total site visits | Percentage trend displayed |
| New Enquiries | Customers created in last 30 days | KPI animation on load |
| Funnel | Enquiries → Qualified → Site Visits → Negotiation (meeting notes) → Sales | Meeting notes proxy negotiation stage |
| Lead Sources | Distribution of `dealType` | Doughnut visualization |
| Call Intelligence | `notes.type==='call'` + text parsed for duration + agent pattern | Regex extraction for "agent:" label |

**Why Client-Side?** Lower latency iteration, avoids premature backend complexity, supports flexible experimental transformations.

---
## 12. Security & Compliance Considerations
| Area | Current Implementation | Planned Hardening |
|------|------------------------|-------------------|
| Auth | Bcrypt hashed passwords; no sessions/JWT yet | Introduce JWT + refresh rotation |
| Transport | Assumes HTTP (dev) | Enforce TLS termination in production |
| Sensitive Env | `.env` contains API + Gmail credentials | Vault/KMS or secret manager migration |
| AI Queries | Read-only enforced; operator whitelist | Add rate limiting + anomaly detection |
| Input Validation | Basic required checks | Central schema validation layer (Zod/JOI) |
| Uploads | Disk write, MIME type filter | Virus scan + S3 + signed URLs |
| Logging | Custom request logger (middleware/logger.js) | Structured JSON logs + correlation IDs |
| Error Surfaces | Standardized fail/ok wrappers | Add error taxonomy & alerting hooks |

---
## 13. Performance & Scalability
| Dimension | Current | Scaling Path |
|----------|---------|--------------|
| Read Throughput | Lean reads, indexed queries | Replica sets, read preference tuning |
| Write Volume | Low-mid (manual agent inputs) | Shard by property/firmId if multi-tenant |
| Assets (Images) | Local FS bound | Object storage (S3/Cloud Storage) + CDN |
| AI Latency | Single model call per prompt | Batch planning, caching frequent schemas |
| Analytics | Client recompute | Move selective heavy aggregates to server cron + cache layer |

**Optimization Candidates:**
- Pre-compute monthly revenue snapshots nightly.  
- Introduce Redis for ephemeral session/cache.  
- Implement ETag headers for static page caching.  

---
## 14. Deployment & Environment Strategy
| Environment | Purpose | Differences |
|------------|---------|------------|
| Development | Rapid iteration | Mock/real local Mongo, verbose logs |
| Staging | Pre-release validation | Seeded anonymized data, full TLS |
| Production | Client live usage | Hardened secrets, autoscaling policies |

**Config Flags (from `.env`, redact secrets):**
- `NODE_ENV`, `PORT`  
- `MONGODB_URI`, `MONGODB_PRODUCTION_URI`  
- `GMAIL_USER`, `GMAIL_APP_PASSWORD` (to be rotated)  
- `GEMINI_API_KEY`, `GEMINI_MODEL`  
- `JWT_SECRET`, `SESSION_SECRET` (future auth layer).  

---
## 15. Logging & Observability
| Layer | Current | Future |
|-------|---------|--------|
| Request | Middleware prints entries | Structured winston/pino with JSON |
| Errors | Console stderr | Centralized error aggregator + Slack/Teams webhook |
| AI Query Outcomes | Implicit | Persist anonymized prompt + execution metadata for audit |
| Metrics | Manual inspection | Prometheus exporters + Grafana dashboards |

---
## 16. Error Handling Approach
- Unified `ok()` / `fail()` response helpers ensure predictable JSON shape.  
- 4xx for validation/semantic errors, 5xx for system faults.  
- Graceful AI failure fallback: returns explanatory message without halting UI render.  

---
## 17. UX & Design Principles
| Principle | Implementation Example |
|-----------|------------------------|
| Cognitive Clarity | Query panel hidden in Chat mode to reduce overload |
| Hierarchical Typography | Playfair Display for headline brand weight; Plus Jakarta Sans for operational clarity |
| Motion as Feedback | GSAP entrance only once per render cycle (kills previous tweens) |
| Progressive Disclosure | Email send only after explicit user trigger (Reach) |
| Executive Readability | INR normalization (Lakhs/Crores) for macro metrics |
| Contextual Affordance | Follow-up bell icon derived from future-dated notes |

---
## 18. Extensibility & Roadmap (Next 3–6 Months)
| Initiative | Description | Impact | Dependency |
|------------|-------------|--------|-----------|
| Multi-Tenancy | Firm-scoped isolation (firmId) | Expandable SaaS footprint | Schema augmentation |
| Role-Based Access | Granular permissions (Owner, Agent, Analyst) | Governance & compliance | Auth upgrade |
| Activity Streams | Unified timeline across entities | Cross-functional situational awareness | Event sourcing layer |
| Webhooks / Integrations | External ERP / Marketing automation | Ecosystem leverage | API Gateway |
| Property Valuation Model | Predictive pricing from historical closures | Advisory upsell | Data volume growth |
| Real-Time Notifications | WS/Socket alerts for follow-ups | Engagement timeliness | Pub/Sub or Socket.io |
| Advanced Reach (Sequencer) | Cadence planning, templating, A/B metrics | Pipeline acceleration | Campaign schema |
| Analytics Service Refactor | Move heavy aggregations server-side | Performance & mobile optimization | Worker + cache |
| Audit Logging | Immutable compliance trail | Enterprise readiness | Storage & retention policy |
| Mobile-Optimized UI | Responsive or dedicated PWA | Field agent adoption | Component refactor |

---
## 19. Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| AI Hallucination | Medium | Misleading narrative | Strict schema spec + highlight query block |
| Email Deliverability | Medium | Outreach inefficacy | SPF/DKIM + dedicated transactional provider |
| Data Growth (Images) | High | Storage bloat | Migrate to CDN + lifecycle policies |
| Security (Secrets in .env) | High | Compromise | Vault + rotation automation |
| Performance (Client-side heavy analytics) | Medium | Browser CPU spikes | Hybrid server aggregation |
| Duplicate Lead Entry (Phone variants) | Low | Data cleanliness | Normalization & fuzzy duplicate check |

---
## 20. Glossary
| Term | Definition |
|------|-----------|
| BHK | Bedroom-Hall-Kitchen configuration (regional unit style) |
| Funnel | Sequential stages transforming enquiries to closed sales |
| Follow-Up | Scheduled future interaction logged as note with `followUpDate` |
| Lean Query | Mongoose query returning plain JS objects (performance) |
| NL Query | Natural language prompt converted to structured Mongo filter |
| Narrative | AI-generated executive summary contextualizing query results |

---
## 21. Governance & Change Management
- All schema changes require backward compatibility review (additive or field default).  
- Route additions must follow REST naming (`/api/{entity}`) with `ok()/fail()` envelope.  
- AI module changes gated by sandbox testing to validate JSON shape integrity.  

---
## 22. Summary & Strategic Positioning
GRWO positions itself as a precision operating layer for real estate firms seeking hybrid intelligence: not just storing data but dynamically interpreting it. Its modular foundation makes it amenable to enterprise hardening (RBAC, multi-tenancy, audit trails) while its existing AI core reduces analysis friction immediately.

> "From raw interaction logs to board-level clarity in one interface."  

---
## 23. Appendix – Future Architectural Evolution (Indicative)
```
Phase 1: Monolith + Client Aggregations
Phase 2: Service Segmentation (Auth, Analytics, AI) + Redis Cache
Phase 3: Event Bus (Kafka / NATS) + Near Real-Time Streams
Phase 4: ML Valuation Microservice + Feature Store
Phase 5: Multi-Region + DR / Active-Active Replication
```

---
### End of Document
