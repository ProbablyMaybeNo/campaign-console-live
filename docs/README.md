# Wargame Campaign Tracker

> **📊 For Agents**: See [MASTER_DEVELOPMENT_AUDIT.md](./MASTER_DEVELOPMENT_AUDIT.md) for current development status (85% complete), priorities, and coordination guidelines. Also see [AGENT_COORDINATION.md](./AGENT_COORDINATION.md) for workflow instructions.

**Planning & Architecture Handover Document**

---

## Purpose of This Document

This README is the **single source of truth** for planning and architecting the **Wargame Campaign Tracker** web app.

It is intended for use by an AI planning/build agent (Antigravity) and contains:

- Product vision and constraints  
- Confirmed decisions from prior discussions  
- UI and UX expectations  
- Rules repository integration requirements  
- Warband Builder requirements  
- Narrative system rules  
- Explicit non-goals and scope boundaries  
- Required external references (Figma, GitHub rules repo)  

**This task is for planning and architecture only.  
Do NOT generate production code at this stage.**

---

## Product Vision (High-Level)

The **Wargame Campaign Tracker** is a **GM-first, rules-aware campaign dashboard** built around an **infinite whiteboard UI**.

It is designed to:

- Let a GM assemble a modular campaign dashboard using draggable components  
- Auto-populate components from a structured, GitHub-hosted rules database  
- Provide players with a read-only but interactive view of campaign state  
- Include a fully rules-validated **Warband Builder** linked to the campaign’s chosen ruleset  

This is **not** a generic productivity app, document editor, or freeform whiteboard.

It is a **structured campaign table powered by rules data**.

---

## Canonical References (REQUIRED)

### Local UI Reference Assets (Canonical)

The following local directory contains **authoritative UI reference images** and should be reviewed and followed when planning or building the UI:

D:\AI-Workstation\Antigravity\apps\campaigntracker\app\UI Element Examples

These images demonstrate:

- Vintage computer terminal UI style
- Black background
- White primary text
- Neon green primary accents
- Neon blue secondary labels
- Red warning/alert accents
- Monospaced typography (IBM Plex Mono or equivalent)
- Component chrome, spacing, and hierarchy
- Overlay/modal patterns (e.g. Add Component)
- Dashboard composition and component framing

**These images are design guides, not content guides.**  
They define *visual language, layout patterns, and interaction affordances*, not game-specific data.

When the Figma prototype and local UI examples overlap:

- Use Figma for layout and flow
- Use the UI Element Examples for visual treatment and tone

### UI / UX Reference (Canonical)

**Example Figma Prototype of Campaign Tracker**

<https://www.figma.com/make/UyzMSHOxJVd43worzMQWVa/Wargaming-Campaign-Tracker?fullscreen=1&t=NEu1c6idaZY7TISI-1>

This Figma file defines:

- Layout hierarchy  
- Component chrome  
- Sidebar structure  
- Add Component overlay  
- Warband Builder layout  
- Visual style (terminal aesthetic)  

**Treat this as canonical UI intent, not decorative inspiration.**

---

### Rules Repository (Canonical Example)

**Wargame Rules Repo (Automated DB Example)**

<https://github.com/ProbablyMaybeNo/konflikt-47-automated-db>

This repository represents the **expected output** of the automated rules-database creation pipeline and must be used as the reference model for:

- Repo structure  
- Rules group enumeration  
- Data shapes  
- Validation constraints  
- Filtering and tagging assumptions  

---

## What This App IS

- A **GM-controlled campaign dashboard**  
- An **infinite canvas** with modular components  
- A **rules-aware system**, not just text display  
- A **viewer-first experience for players**  
- A **single-board campaign table** with many components  
- A **consumer of rules repositories**, not a rules editor  

---

## What This App Is NOT

- ❌ Notion / Miro / whiteboard clone  
- ❌ Battlescribe replacement (it consumes similar data but does more)  
- ❌ Real-time collaborative canvas (no live cursors in v1)  
- ❌ Multi-board or tabbed dashboard system  
- ❌ Freeform wiki or document editor  
- ❌ Lore reader (lore is explicitly excluded from rules ingestion)  

---

## Core Non-Negotiables

### 1. Infinite Whiteboard Dashboard

- One campaign = **one infinite board**  
- Pan and zoom available to **all users**  
- Components are:
  - Added by GM  
  - Moved/resized by GM only (initially)  
  - Viewable and interactable by players (scroll, open, filter)  
- Component layout persists per campaign  

---

### 2. GM-Only Layout Control

Players **cannot**:

- Move components  
- Resize components  
- Hide components  

Players **can**:

- Pan and zoom the board  
- Read component contents  
- Use filters/sorts if enabled  

(Player layout customization may exist later but is out of scope for v1.)

---

## UI Style (Hard Requirement)

- Vintage computer terminal aesthetic  
- Black background  
- Monospaced font (IBM Plex Mono or equivalent)  
- White primary text  
- Neon green accents  
- Neon blue secondary labels  
- Red warning accents  
- Thin neon outlines  
- Flat UI (no illustrations, photos, or characters)  

---

## Sidebar Structure (Minimum)

The sidebar must include at least:

- Overview  
- Map  
- Rules  
- Warbands  
- Narrative  

---

## Component System (Core Mechanic)

### Component Creation

Components are created via a floating **“+” button** on the dashboard.

The **Add Component overlay** must include:

- Component name  
- Component type dropdown (table, card, gallery, panel, etc.)  
- Rule Set Linked dropdown:
  - Repo Rules Group  
  - Custom (manual content)  
- Rules Group dropdown (if repo-linked)  
- Toggles:
  - Filterable  
  - Sortable  
  - Collapsible  
- Visual settings:
  - Highlight color  
  - Icon  
- Live preview region  

---

### Component Data Sources

#### Repo-Linked Components

- Pull data from the campaign’s pinned rules repository  
- Populate automatically based on the selected Rules Group  
- Support GM-configured filters (tags, faction, keywords, etc.)  
- Filters must be saved in the component configuration  

#### Custom Components

- Blank components created by the GM  
- GM can manually enter:
  - Text  
  - Images  
  - Table rows  
  - Cards  
- Any UI type must be creatable as a custom component  
- Export/share later is optional; manual population is the priority  

---

## Component Types (Minimum Set)

The first release must support at least:

- Rules / Text Panel  
- Table  
- Card / List  
- Campaign Narrative component (GM-only)  
- Campaign Players component (auto-populated)  
- Map Component (normal component, not a board)  
- Messages / Announcements  
- Scheduling / Round Tracker  

Additional component types (market, injuries, resources, etc.) should be architecturally possible but are optional.

---

## Map Component (Clarification)

The **Map Component** is:

- Just another component type  
- Draggable and resizable  
- Displays an image or embedded map  
- May include pins or annotations  

It is **NOT**:

- A representation of multiple boards  
- A navigation system  
- A campaign structure mechanic  

---

## Narrative System (Explicit Rules)

### Campaign Narratives

- Created and edited **only by the GM**  
- Displayed via a Campaign Narrative component  
- Represent global campaign story beats  

### Warband Narratives

- Created by players **for their own warbands**  
- Entered via the Warband Builder  
- Linked in the Campaign Players component/table  

This split is intentional and must be enforced by permissions.

---

## Warband Builder (Secondary System, Still Critical)

### General Rules

- Each player builds **exactly one warband per campaign**  
- Warband Builder is a **separate page**, accessed via the sidebar  
- Uses the **same pinned rules repository** as the campaign  

### Validation (Non-Negotiable)

Warband validation must be **rules-driven**, not heuristic:

- Points limits  
- Sub-faction legality  
- Roster constraints  
- Required / forbidden units  
- Option dependencies  
- Unlock rules  

Validation logic is defined by the rules repository schema and must return human-readable errors.

### GM-Defined Campaign Constraints

At campaign creation, the GM defines:

- Points limit (required)  
- Allowed factions / sub-factions (if supported by the ruleset)  
- Other constraints supported by the schema  

---

## Campaign Players Component

The dashboard must support an auto-populated **Campaign Players** component showing:

- Player name  
- Warband name  
- Sub-faction  
- Current points  
- Upcoming opponent  
- Link to warband narrative entries  
- Link to “warband one-sheet”  

---

## Rules Repository Contract (Critical)

The app must consume repositories generated by an automated pipeline.

The plan must assume a repo contract that includes:

- Manifest file declaring:
  - Ruleset ID, name, version  
  - Schema version  
  - Rules Groups (ID, label, data type)  
  - Faction / sub-faction identifiers  
- Structured data for:
  - Rules text  
  - Tables  
  - Units  
  - Equipment  
  - Abilities / keywords  
- **Constraint model** supporting legality and validation  

**Lore sections must be excluded** from rules ingestion.

---

## Rules Repo Version Pinning (Mandatory)

Each campaign must store:

- Repo URL  
- Pinned ref (tag or commit)  
- Resolved commit SHA  
- Import timestamp and schema version  

Ruleset updates must be **explicit and manual**.  
No silent updates during a campaign.

---

## Technical Constraints & Assumptions

- No real-time collaborative editing in v1  
- One board per campaign  
- GM-only layout control initially  
- Repo access is machine-fetchable  
- Planning & architecture only — no code yet  

---

## Required Planning Output (Exact Format)

Antigravity must produce a planning document with these sections **in this order**:

1) Product summary  
2) Confirmed decisions (from this README)  
3) MVP scope vs Phase 2 scope  
4) UX map (Login → Overview → Setup → Tracker → Warband Builder)  
5) Rules repo ingestion plan (pinning, caching, failure modes)  
6) Rules repo contract (rules groups + constraints model)  
7) Component system specification (types, configs, filtering)  
8) Warband Builder specification (entities, validation, one-sheet)  
9) Narrative system specification  
10) Data model (entities + relationships)  
11) API surface (endpoints + example payloads)  
12) Implementation steps (vertical slice first)  
13) Risks + mitigations  
14) Essential open questions (if any)  

**Do not generate UI code, DB migrations, or production logic.**

---

## Recommended Documentation Artifacts

If present, Antigravity should reference these files in `/docs`:

- `campaign-tracker.reference-model.json` (reference example; not runtime)  
- `rules-repo.contract.json` (repo ingestion contract)  
- `api.examples.json` (API shape examples)  
- `execution-plan.md` (Phase 1 / Phase 2 checklist)  

---

## Final Note

This project only succeeds if:

- The rules repository remains authoritative  
- Components remain modular but structured  
- The dashboard remains a campaign table, not a document editor  

Design decisions should favor **clarity, determinism, and extensibility** over cleverness.

---

**End of handover document.**
