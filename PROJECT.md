# R1 Agents - Enterprise Insurance Portal

## 1. Project Overview

**R1 Agents** is an enterprise-grade web application tailored for insurance agencies, brokers, and operational staff in India. The platform streamlines the entire motor vehicle insurance enquiry lifecycle—from vehicle details capture and document upload, through quotation generation, insurer comparison, payment processing, policy issuance, and staff governance.

- **Client Application**: Angular 21 Single Page Application (SPA).
- **Target Audience**: Insurance Agents (Agency Owners) and Agency Staff/Employees.
- **Design Philosophy**: Based on the **IBM Carbon Design System**—deliberately flat (0px borders), high-contrast enterprise typography (IBM Plex Sans, IBM Plex Mono), structured information density, and IBM Blue (`#0f62fe`) accents.

---

## 2. Technology Stack & Tooling

| Category | Technology / Library | Version / Details |
| :--- | :--- | :--- |
| **Framework** | Angular | `^21.2.0` (Signals-first, Standalone Components) |
| **Language** | TypeScript | `~5.9.2` |
| **Build & Tooling** | Angular CLI / `@angular/build` | `^21.2.3` with ESBuild engine |
| **Reactivity** | Angular Signals & RxJS | `signal()`, `computed()`, `RxJS ~7.8.0` |
| **Styling** | Vanilla CSS & Tailwind CSS | Tailwind CSS `^4.1.12` + PostCSS |
| **Design System** | IBM Carbon Design System Aesthetic | IBM Plex Sans, IBM Plex Mono, 0px radius |
| **Unit Testing** | Vitest & `@angular/build` | `vitest ^4.0.8`, JSDOM `^28.0.0` |
| **QR Code Engine** | `qrcode` | `^1.5.4` (for instant payment QR generation) |
| **Media & Storage** | Cloudflare R2 | Direct media streaming & storage integration |
| **Package Manager** | npm | `npm@11.17.0` |

---

## 3. Architecture & Design Patterns

### 3.1 Signals-First Reactive Architecture
- **State Management**: Standalone Angular components utilize native **Angular Signals** (`signal<T>`) for local and shared component state.
- **Computed Derived State**: Uses `computed()` for filters, filtered collections, validation status, and badge states.
- **Dependency Injection**: Functional `inject()` pattern throughout all services, components, and route guards.

### 3.2 Design System Guidelines (Carbon Design Inspired)
- **Surfaces & Borders**: Strict 0px border-radius across inputs, buttons, tables, badges, and modals.
- **Palette**:
  - Primary Accent: IBM Blue `#0f62fe` (hover: `#0050e6`, active: `#002d9c`).
  - Dark Surfaces: `#161616` (header / contrast elements), `#262626`.
  - Neutral Backgrounds: Canvas `#ffffff`, Surface-1 `#f4f4f4`, Border `#e0e0e0`.
  - Semantic Statuses:
    - Green (Success / Issued): `#24a148`, background: `#defbe6`
    - Yellow (Pending / In Review): `#f1c21b`, background: `#fdf6dd`
    - Red (Cancelled / Error): `#da1e28`, background: `#fff1f1`
- **Typography Scale**:
  - Font Families: `IBM Plex Sans` for UI, `IBM Plex Mono` for vehicle plate numbers, codes, and IDs.
  - Readability Standard: Minimum text size of **12px** across all large-screen views.

---

## 4. Application Modules & Functional Features

```
+-----------------------------------------------------------------------------------+
|                                  R1 AGENTS APP                                    |
+-----------------------------------------------------------------------------------+
  |
  +---> [Authentication & Guards]
  |       - Login (/login)
  |       - Signup (/signup)
  |       - Route Guards: AuthGuard, GuestGuard, AgentGuard
  |
  +---> [Dashboard (/dashboard)]
  |       - KPI Metric Tiles (Created, Quoted, Policy Issued, Cancelled)
  |       - Products Catalog & Visual Highlights
  |       - Quick Actions (Create Enquiry, View Reports)
  |
  +---> [Enquiry Management (/enquiry)]
  |       - List View with Step Lifecycle Tracker
  |       - Filter Toolbar (Search, Status, Date, Vehicle Type, Staff Filter)
  |       - Drawer / Quick Inspection
  |       - Document Upload Modal (Cloudflare R2 Integration)
  |
  +---> [Create Enquiry (/enquiry/create-enquiry)]
  |       - Multi-Step Creation Wizard
  |       - Dynamic Policy Rules (Third Party policy auto-hides Previous Claim & NCB)
  |       - Dynamic Document Upload (Single/Multiple RC images)
  |
  +---> [Quotes (/quotes)]
  |       - Insurer Comparison & Add-on Selection
  |       - Premium Breakdown (OD, TP, GST, Net Payable)
  |
  +---> [Payments (/payments)]
  |       - Ledger Account deduction & Gateway integration
  |       - UPI Dynamic QR Code generation
  |       - Mandatory Payment Proof / Screenshot upload
  |
  +---> [Policy (/policy)]
  |       - Policy document viewer & download
  |
  +---> [Staff Management (/employees)] (Agent-only)
  |       - Staff roster with search & pagination
  |       - KPI Tiles: All Staff, Active Staff, Inactive Staff
  |       - Status Toggle (direct HTTP PUT)
  |       - Add Staff Modal with account link
  |
  +---> [Profile (/profile)] & [RC View (/rc-view)]
```

### 4.1 Authentication & Authorization
- **JWT Authentication**: Stores token in `sessionStorage` and attaches `Authorization: Bearer <token>` to outbound requests via `HttpClient`.
- **Role-Based Access**:
  - `Agent`: Agency owner. Can manage staff, view all agency enquiries, and filter enquiries by specific staff agents.
  - `Staff` / `Employee`: Sub-agent under an agency account. Restricted from accessing `/employees`.
- **Guards**:
  - `authGuard`: Protects private routes (`/dashboard`, `/enquiry`, `/quotes`, `/payments`, etc.).
  - `guestGuard`: Prevents authenticated users from seeing `/login` and `/signup`.
  - `agentGuard`: Restricts `/employees` strictly to `Agent` users.

### 4.2 Enquiry Lifecycle
Enquiries proceed through a stepped 4-stage lifecycle:
1. **Created**: Vehicle and customer details submitted.
2. **Step 1 (Documents)**: RC front/back and supporting documents uploaded.
3. **Step 2 (Quoted)**: Insurer quotes generated and presented.
4. **Step 3 (Payment Pending)**: Customer selected a quote, payment proof submitted.
5. **Issued / Completed**: Policy issued by the insurance provider.

### 4.3 Create Enquiry Wizard
- **Step 1 - Vehicle & Customer**: Registration number, fuel type, vehicle class, customer contact info.
- **Step 2 - Insurance & Claim History**:
  - Policy Type Selection (Comprehensive, Third Party, Own Damage).
  - *Conditional Logic*: Selecting **Third Party** instantly hides *Previous Claim* and *No Claim Bonus (NCB)*, automatically resetting them.
- **Step 3 - Documents**:
  - Primary document slots for RC Front, RC Back, Previous Policy, and Aadhar/PAN.
  - Supports single-sided RC cards or multiple additional pages dynamically.

### 4.4 Staff Management (`/employees`)
- Reserved for logged-in Agents.
- Fetches nested response `{ data: { staff: { items, pageNumber, totalRecords, ... }, totalStaff, activeStaff, inactiveStaff } }`.
- KPI Tiles reflect real-time active/inactive counts directly from the backend.
- Status toggle uses direct `PUT /api/User/{accountId}/toggle-status/{id}` without fallbacks.

---

## 5. Directory Structure

```
c:/Anand/R1Agents/
├── public/                     # Static assets (favicons, fonts, images)
├── src/
│   ├── app/
│   │   ├── components/         # Standalone UI Components
│   │   │   ├── create-enquiry/         # New enquiry multi-step wizard
│   │   │   ├── dashboard/              # Metrics overview & shortcuts
│   │   │   ├── employees/              # Staff management & KPI tiles
│   │   │   ├── enquiry/                # Main enquiry table & filter toolbar
│   │   │   ├── enquiry-details/        # Side drawer with enquiry specifics
│   │   │   ├── enquiry-upload-modal/   # Dedicated document upload modal
│   │   │   ├── insurance-products/     # Product grid view
│   │   │   ├── login/                  # Authentication login
│   │   │   ├── navbar/                 # Global navigation & agent branding
│   │   │   ├── payments/               # Payment options & screenshot upload
│   │   │   ├── policy/                 # Policy summary & downloads
│   │   │   ├── profile/                # User profile & credentials
│   │   │   ├── quotes/                 # Insurer quote cards & comparison
│   │   │   ├── RC/                     # RC card preview components
│   │   │   │   ├── rc-front/
│   │   │   │   ├── rc-back/
│   │   │   │   └── rc-view/
│   │   │   ├── reports/                # Production & sales reports
│   │   │   └── signup/                 # Agent onboarding registration
│   │   ├── guards/             # Route Guards (auth, guest, agent)
│   │   ├── models/             # TypeScript data contracts & response interfaces
│   │   │   ├── account.model.ts
│   │   │   ├── auth.model.ts
│   │   │   ├── dashboard.model.ts
│   │   │   ├── enquiry.model.ts
│   │   │   ├── rc.model.ts
│   │   │   ├── response.model.ts
│   │   │   └── staff.model.ts
│   │   ├── services/           # Injectable Angular Services
│   │   │   ├── account/
│   │   │   ├── auth/
│   │   │   ├── common/
│   │   │   ├── dashboard/
│   │   │   ├── enquiry/
│   │   │   └── staff/
│   │   ├── app.config.ts       # Application providers & router configuration
│   │   ├── app.routes.ts       # Route declarations
│   │   └── app.ts              # Root standalone component
│   ├── environments/           # Environment configs (local, dev, prod)
│   │   ├── environment.ts
│   │   └── environment.development.ts
│   ├── index.html              # Shell HTML with IBM Plex Sans Google Font
│   ├── main.ts                 # Bootstrap entry point
│   └── styles.css              # Global styles, variables, & utility classes
├── angular.json                # Angular CLI workspace configuration
├── DESIGN.md                   # Full Carbon Design System color & type tokens
├── package.json                # NPM package manifest & scripts
├── tsconfig.json               # TypeScript compiler config
└── vitest.config.ts            # Vitest unit test configuration
```

---

## 6. API Integration Reference

| Area | HTTP Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/User/login` | Authenticate agent/staff & obtain JWT |
| **Auth** | `POST` | `/api/User/register` | Register new Agent account |
| **Enquiries** | `GET` | `/api/Enquiry/agent/enquiries` | Fetch paged enquiries with filters & optional `AgentId` |
| **Enquiries** | `POST` | `/api/VehicleEnquiry` | Submit initial vehicle enquiry |
| **Documents** | `GET` | `/api/VehicleEnquiry/{id}/documents` | Retrieve existing documents for an enquiry |
| **Documents** | `POST` | `/api/VehicleEnquiry/{id}/documents` | Upload new document metadata & R2 media keys |
| **Quotes** | `GET` | `/api/Quote/{enquiryId}` | Fetch insurer quotation options |
| **Staff** | `GET` | `/api/User/list-all-staffs/{accountId}` | Fetch paged staff roster & totals (`totalStaff`, `activeStaff`, `inactiveStaff`) |
| **Staff** | `POST` | `/api/User/create-staff` | Create a new staff under the agency account |
| **Staff** | `PUT` | `/api/User/{accountId}/toggle-status/{id}` | Toggle staff active/inactive state |
| **Dashboard** | `GET` | `/api/Dashboard/products` | Retrieve active insurance product offerings |

---

## 7. Developer Guide & Commands

### 7.1 Prerequisites
- **Node.js**: `v20.x` or `v22.x`
- **NPM**: `v10+` or `v11+`

### 7.2 Installation
```bash
npm install
```

### 7.3 Running the Development Server
```bash
npm start
# or
ng serve
```
Navigate to `http://localhost:4200/`. The app hot-reloads on file changes.

### 7.4 Running Unit Tests
Unit tests use **Vitest**:
```bash
# Run all tests once
npm test -- --watch=false

# Run tests in interactive watch mode
npm test
```

### 7.5 Production Build
```bash
npm run build
```
Compiled output is generated in `dist/R1Agents/browser/`.

---

## 8. Key Recent Implementations

1. **Staff Filter for Agents in Enquiry List**:
   - Filter toolbar conditionally presents a "Staff" select dropdown if logged-in user is an `'Agent'`.
   - Passes `AgentId` query parameter to `/Enquiry/agent/enquiries` to view staff-specific enquiries.
2. **Third Party Policy Rule**:
   - Auto-hides *Previous Claim* and *No Claim Bonus (NCB)* in Create Enquiry when "Third Party" is selected.
3. **Flexible Document Uploads**:
   - Supports single-sided RC cards as well as dynamic multi-slot uploads for RC cards and previous policy endorsements.
4. **Mandatory Payment Proof**:
   - Payments module enforces screenshot upload before submission, linking transaction proofs to vehicle enquiries.
5. **Direct Status Toggle for Staff**:
   - Direct `PUT` request to `/api/User/{accountId}/toggle-status/{id}`, eliminating pre-flight fallback errors.
6. **Nested Staff Response Binding**:
   - Seamless parsing of `{ data: { staff: { items, ... }, totalStaff, activeStaff, inactiveStaff } }` to ensure KPI cards and pagination stay in sync.
