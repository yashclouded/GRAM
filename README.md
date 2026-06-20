# GRAM — Direct Agricultural Marketplace (Phase 0 Demo)

GRAM is a direct agricultural trading platform that connects farmers, buyers, and transporters without middlemen. This repository is the **Phase 0 hackathon demo** — the marketplace website layer. It is *not* the full decentralized protocol (that's a later phase); think of this as the front door of GRAM: a working, mobile-first web app where real people can sign up and complete trades end-to-end.

---

## Problem Statement

Indian agricultural trade is dominated by brokers and commission agents who control price discovery, delay payments, and extract 10–30% margins from both farmers and buyers. Small farmers have no direct access to buyers, no visibility into fair prices, and no way to track their produce after it leaves their hands.

GRAM removes the broker by giving farmers, buyers, and transporters a shared coordination layer — direct listings, direct orders, direct tracking.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 18 + Vite | Fast iteration; no SSR needed for demo |
| Styling | Vanilla CSS (mobile-first) | Maximum control; Capacitor-ready |
| Auth | Supabase Auth (email/password) | Built-in RLS, no separate auth server |
| Database | Supabase (PostgreSQL) | Managed Postgres with real-time subscriptions |
| i18n | Inline bilingual dicts (EN/HI) | Zero-dependency, instant switch, easy to extract to files |
| Deployment | Vercel-compatible static export | `vite build` → `dist/` → drop on Vercel |

> Note: The build prompt specified Prisma + SQLite, but Supabase was explicitly chosen for this project because the Supabase project was already provisioned and Supabase Auth + RLS eliminates the need for a separate backend service entirely.

---

## Features

### 🌾 Farmer
- **Create Listing**: crop type (10 crops), quantity + unit, quality grade (A/B/C), expected price, location, description
- **My Listings**: all listings with live status badges (Available / Offer Received / Sold / In Transit / Delivered)
- **Offers**: incoming buyer orders — Accept or Reject each one
- **Tracking**: accepted orders with a step-by-step timeline; "Mark Payment Received" button once the buyer confirms delivery

### 🛒 Buyer
- **Browse Listings**: real-time list from Supabase; search by crop name, filter by grade and max price
- **Place Order**: modal with quantity input, validated against available stock
- **My Orders**: all orders with status badges; "Confirm Delivery" button when transporter marks delivered

### 🚚 Transporter
- **My Vehicle Info**: vehicle type dropdown, capacity, service area — persisted to `transporter_profiles`
- **Available Jobs**: orders matched between farmer and buyer, not yet assigned to a transporter
- **My Jobs**: accepted jobs with status buttons: Mark Picked Up → Mark In Transit → Mark Delivered
- **Job History**: all completed deliveries

### 🔔 Shared (all roles)
- **In-app Notifications**: real-time bell with unread count; messages auto-created by Supabase triggers on order status changes — bilingual (EN/HI)
- **Profile/Settings**: edit name, phone, village, district, state; language selector; logout
- **Language Toggle**: visible in every screen header; switches all text instantly without a reload

---

## Setup & Installation

```bash
# 1. Clone
git clone https://github.com/your-org/agrinerve.git
cd agrinerve/dashboard

# 2. Install dependencies
npm install

# 3. Configure environment (copy and fill in)
cp .env.example .env
# Edit .env — see "Environment Variables" section below

# 4. Set up Supabase schema
# - Go to your Supabase project → SQL Editor
# - Paste the contents of supabase_schema.sql and run it
# - This creates: listings, orders, transporter_profiles, notifications tables + RLS + triggers

# 5. Start dev server
npm run dev
# → opens at http://localhost:5173
```

---

## Environment Variables

Create `dashboard/.env` with:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL (found in Project Settings → API) |
| `VITE_SUPABASE_ANON_KEY` | Public anon key — safe to expose to the browser; RLS enforces data access |

---

## Folder Structure

```
agrinerve/
├── dashboard/               # Vite + React marketplace app (this README)
│   ├── src/
│   │   ├── components/      # Shared UI: AppShell, NotificationBell, StatusBadge, EmptyState
│   │   ├── contexts/        # AuthContext (Supabase auth + profile), LanguageContext
│   │   ├── pages/           # One file per screen: Auth, LandingPage, Onboarding,
│   │   │                    #   FarmerApp, BuyerApp, TransporterApp, ProfilePage
│   │   ├── index.css        # Global mobile-first styles
│   │   └── App.jsx          # Route definitions
│   ├── supabase_schema.sql  # Full DB schema to run in Supabase SQL Editor
│   └── .env.example         # Environment variable template
│
├── node/                    # Go backend — GRAM consensus/mesh (separate system)
├── docs/                    # Design doc, architecture notes
└── README.md                # This file
```

---

## Adding a New Language

1. Open each page file (e.g. `FarmerApp.jsx`) — each has a `const dict = { en: {...}, hi: {...} }` at the top.
2. Add a new key, e.g. `mr: { ... }` with Marathi translations for every string.
3. In `LanguageContext.jsx`, update the default state if desired.
4. In any language toggle button, add a third option: `{lang === 'en' ? '...' : lang === 'hi' ? '...' : 'English'}`.
5. In `NotificationBell.jsx`, add `message_mr` column support (or reuse `message_hi` as fallback until the Supabase schema is extended).

> When the string count grows, extract dicts to `src/locales/en.json`, `src/locales/hi.json`, etc. and load them via a simple `useTranslation()` hook. The inline dict pattern is intentionally extractable.

---

## Known Limitations / What's Mocked

- **No real payments** — "Mark Payment Received" is a status flag only; no payment gateway
- **No real AgriStack / ONDC / Beckn integration** — listings are stored in Supabase, not on any government API
- **No Agmarknet live prices** — The Go backend has an oracle adapter (`node/internal/oracle/`) but the marketplace frontend does not call it in this build (removed to eliminate backend dependency for standalone demo)
- **No real-time push / SMS / IVR** — notifications are in-app only via Supabase realtime
- **Single role per user** — one user account = one role; no multi-role support in this version
- **No offline mode** — requires internet connection to Supabase
- **No admin panel or dispute resolution UI**

---

## Roadmap

Future phases beyond this marketplace layer:
- **Phase 1 — Decentralized Mesh**: leaderless Snowball consensus over libp2p, gossip-based listing propagation, no single server required
- **Phase 2 — Oracle Layer**: live Agmarknet mandi price integration, satellite-based crop verification, AI quality grading (Go backend already has stubs for all three)
- **Phase 3 — Offline Resilience**: SMS/IVR fallback for feature-phone users, local-first sync when internet is intermittent

This is the front door of GRAM, not the whole building.
