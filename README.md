# Hackathon Participant QR Pass Management System (PassOS)

A high-speed, single-use QR ticketing and fraud-proof check-in system built with **React**, **PostgreSQL**, and **Supabase Row Level Security (RLS)**.

---

## ⚡ Tech Stack & Architecture

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, Canvas Confetti.
- **QR Generation**: High-fidelity SVG QR codes (`qrcode.react`) encoding **only** cryptographic tokens (`HACK-xxx`), never Personally Identifiable Information (PII).
- **QR Scanning**: Optical camera stream engine (`html5-qrcode`) with autofocus viewfinder, scanline laser, audio feedback, file upload fallback, and manual token input.
- **Backend & Database**: Supabase Auth + PostgreSQL with **Row Level Security (RLS)** and **SECURITY DEFINER RPC** functions for atomic row-level locking.

---

## 🚀 Quick Start

### 1. Install & Run Locally
```bash
# In c:\Vagish\portfolio\Hackathon QR Generator
npm install
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 🗄️ Database Architecture & Postgres Schema

The complete schema is available at [`supabase/schema.sql`](./supabase/schema.sql).

### Table Relationships & Purpose

1. **`approved_participants`**
   - `email text primary key`: Pre-approved list of selected participant emails imported by hackathon organizers.
   - `name text`, `team text`, `college text`, `imported_at timestamptz`.
   - **Role**: Gatekeeper. Only emails present in this table can proceed with registration.

2. **`profiles`**
   - `user_id uuid primary key references auth.users(id) on delete cascade`
   - `name text`, `email text unique not null`, `phone text`, `college text`, `team_name text`
   - `role text check (role in ('participant','admin','scanner')) default 'participant'`
   - `disabled boolean default false`
   - **Role**: Stores participant credentials and enforces role-based access control.

3. **`passes`**
   - `pass_id uuid primary key default gen_random_uuid()`
   - `user_id uuid unique references profiles(user_id) on delete cascade`
   - `token text unique not null`: Cryptographically random 32-hex string (`HACK-xxxx`).
   - `status text default 'active' check (status in ('active', 'disabled'))`
   - `used boolean default false`: Single-use flag.
   - `entry_status text default 'not_entered' check (entry_status in ('not_entered', 'entered'))`
   - `scanned_by uuid references profiles(user_id)`
   - `entry_time timestamptz`
   - **Role**: Physical/digital single-use credential.

4. **`entry_logs`**
   - `entry_id uuid primary key default gen_random_uuid()`
   - `pass_id uuid references passes(pass_id)`
   - `participant_id uuid references profiles(user_id)`
   - `scanned_by uuid references profiles(user_id)`
   - `scanned_at timestamptz default now()`
   - **Role**: Immutable append-only audit trail of every gate scan.

---

## 🔐 Authentication & Pass Claim Flow

```
1. Participant enters email on /register
   ↓
2. check_participant_eligibility(email) RPC verifies email in approved_participants
   ├─ NOT APPROVED ──→ Show "This email is not registered as a selected participant."
   ├─ ALREADY REGISTERED ──→ Show "This participant is already registered. Please log in."
   └─ APPROVED ──────→ Auto-fill Name, Team, College from roster
   ↓
3. supabase.auth.signUp({ email, password }) creates user in auth.users
   ↓
4. provision_participant_pass() RPC atomically creates profiles row + passes row
   ↓
5. Unique cryptographically random token (e.g. HACK-9A4B...) generated
   ↓
6. Participant logs in → redirected to /dashboard and /pass
```

---

## 🛡️ Atomic Single-Use QR Validation (Zero-Race Condition)

### How `scan_qr_pass(p_token)` Prevents Double Entry:
Under high-volume hackathon arrivals, two scanners might scan duplicate copies/screenshots of the same QR at the exact same millisecond.

The Postgres RPC executes an atomic conditional update with row-level write locking (`FOR UPDATE` semantics):

```sql
UPDATE public.passes
SET used = TRUE,
    entry_status = 'entered',
    entry_time = TIMEZONE('utc'::text, NOW()),
    scanned_by = auth.uid()
WHERE token = p_token
  AND used = FALSE
  AND status = 'active'
RETURNING *;
```

1. **Lock Acquisition**: Request A locks the specific row in Postgres where `token = p_token` and `used = false`.
2. **Commit**: Request A marks `used = true`, logs the entry into `entry_logs`, and returns `ENTRY APPROVED`.
3. **Lock Release & Second Evaluation**: Request B evaluates the `WHERE` clause. Because `used` is now `true`, the condition `used = FALSE` fails.
4. **Result**: Exactly `0` rows are modified by Request B.
5. **Diagnostics Branch**: Request B checks the pass record, detects `used = true`, and immediately returns:
   ```json
   {
     "success": false,
     "code": "ALREADY_USED",
     "message": "PASS ALREADY USED: Re-entry is not permitted.",
     "participant": { ... },
     "original_entry_time": "..."
   }
   ```
6. **Concurrency Stress Tester**: A built-in simulator on `/admin/scanner` allows organizers to trigger two simultaneous parallel requests at the exact same millisecond to prove that one request succeeds while the second fails with `ALREADY_USED`.

---

## 📱 Page Sitemap

- **Public**:
  - `/`: Hero landing page, feature highlights, participant instructions.
  - `/register`: Email whitelist verification & pass claim.
  - `/login`: Participant sign-in.
  - `/forgot-password`: Password reset via email.
- **Participant**:
  - `/dashboard`: Gate entry status, profile summary, anti-tamper notice.
  - `/pass`: Fullscreen digital pass, dynamic anti-screenshot ticker, secure QR code, print/PDF button.
- **Admin & Volunteer Scanner**:
  - `/admin/login`: Role-based admin/scanner portal.
  - `/admin/dashboard`: Real-time telemetry, completion rate progress bars, and stats.
  - `/admin/scanner`: Dedicated optical camera scanner with 2.5s auto-reset, today's entry counter, and concurrency test simulator.
  - `/admin/participants`: Searchable/filterable roster, add participant modal, pass revocation.
  - `/admin/import`: CSV batch importer with duplicate rejection and error reports.
  - `/admin/history`: Immutable entry logs with CSV export.
