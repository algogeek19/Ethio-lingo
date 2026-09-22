# Ethio-Lingo: Financial Accountability Learning Platform

Ethio-Lingo is a React 19 + Vite 8 educational application built around a **financial accountability escrow model**. Designed to transform learning intentions into daily habit building, Ethio-Lingo requires learners to deposit a financial stake into escrow (ETB 1,000), complete 4 daily mandatory learning tasks across 6 progressive curriculum levels, and pass daily diagnostic exams to protect their money and earn level payouts.

Administrators receive dedicated oversight capabilities to monitor vault escrow volume, audit learner risk profiles, approve manual bank/Telebirr deposits and payouts, and manage 30-day curriculum modules across all 6 levels.

---

## 🚀 Platform Overview & Core Flow

The Ethio-Lingo learning experience follows a 4-step financial accountability lifecycle:

```
┌─────────────────────────┐       ┌─────────────────────────┐       ┌─────────────────────────┐       ┌──────────────────────────┐
│      1. Onboarding      │  ───> │  2. 4 Daily Mandatory   │  ───> │   3. Streak Protection  │  ───> │   4. 30-Day Settlement   │
│      & Placement        │       │       Task Loop         │       │       vs. Penalty       │       │        & Payout          │
└─────────────────────────┘       └─────────────────────────┘       └─────────────────────────┘       └──────────────────────────┘
  Google OAuth / Auth       Task 1: Lesson Lecture            Pass ≥ 75%: Protect stake         Complete 30-day level:
  + 10-Question Placement   Task 2: Listening Skill           & increment streak                Submit bank/Telebirr
  Quiz or 7-Day Free Trial  Task 3: 20-Min PDF Reading        Fail: -40 ETB penalty             details for full escrow
  (ETB 1,000 stake deposit) Task 4: 20-Question Exam         Miss 24h: -100 ETB penalty        withdrawal payout
```

1. **Onboarding & Placement Quiz**: Authenticate via Google OAuth or Email/Password. Complete a 10-question English diagnostic quiz to enroll directly into **Beginner I** (score 0–7) or **Intermediate I** (score 8–10), or explore via **7-Day Free Trial Mode**. Deposit 1,000 ETB (10% service fee = 900 ETB net stake) into locked escrow.
2. **4 Daily Mandatory Learning Tasks**:
   - **Task 1: Daily Lesson Lecture**: Watch the daily module lecture video. Seeking is strictly locked; video must be watched 100% to complete. Includes a downloadable PDF companion study guide.
   - **Task 2: Listening Practice**: Watch assigned YouTube listening videos with a choice between **Informative (Academic)** or **Entertainment (Cultural)**. Seeking locked, 100% watch required.
   - **Task 3: 20-Min Timed PDF Reading**: Read assigned level PDF books from Supabase Storage in an embedded viewer featuring an active 20-minute timer with tab auto-pause enforcement.
   - **Task 4: 20-Question Daily Exam**: Unlocks only after Tasks 1–3 are complete. 20 multiple-choice questions with a 20-minute countdown.
3. **Streak Protection vs. Penalty Enforcement**:
   - **Pass ($\ge 15/20$ or 75%)**: Protects daily allocated stake, increments continuous streak counter, and triggers celebration confetti.
   - **Fail ($< 15/20$)**: Applies an ETB 40 penalty deduction from locked stake per failed retake.
   - **Missed Day (24h Inactivity)**: Applies an ETB 100 penalty deduction and resets active streak to 0.
4. **30-Day Level Settlement & Withdrawal**: Upon completing all 30 days of a curriculum level, learners submit their Bank or Telebirr account details to request full withdrawal of remaining escrow funds and advance to the next level.

---

## 📚 6-Level Curriculum Framework

Ethio-Lingo offers a structured 6-level sequential English curriculum:

| Level Track | Level Name | Placement Quiz Score | Completion Requirement |
| :--- | :--- | :--- | :--- |
| **Level 1** | Beginner I | Score 0–7 | 30 Module Days (Tasks 1–4) |
| **Level 2** | Beginner II | Advancement | 30 Module Days (Tasks 1–4) |
| **Level 3** | Intermediate I | Score 8–10 | 30 Module Days (Tasks 1–4) |
| **Level 4** | Intermediate II | Advancement | 30 Module Days (Tasks 1–4) |
| **Level 5** | Advanced I | Advancement | 30 Module Days (Tasks 1–4) |
| **Level 6** | Advanced II | Advancement | 30 Module Days (Tasks 1–4) |

---

## 👥 Role-Based Architecture

Ethio-Lingo features dual-role architecture separating **Learner** and **Administrator** capabilities:

```
                         ┌───────────────────────────┐
                         │      Role Context         │
                         │   (Learner vs. Admin)     │
                         └─────────────┬─────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
    ┌───────────────────────┐                     ┌───────────────────────┐
    │     LEARNER ROLE      │                     │      ADMIN ROLE       │
    ├───────────────────────┤                     ├───────────────────────┤
    │ • Learner Dashboard   │                     │ • Platform Analytics  │
    │ • 4 Daily Workspace   │                     │ • Learner Directory   │
    │   Tasks & Video Player│                     │ • Bank & Deposit Queue│
    │ • 20-Min PDF Reader   │                     │ • Escrow Withdrawals  │
    │ • Daily Exam Runner   │                     │ • 6-Level Curriculum  │
    │ • Escrow Vault Wallet │                     │   Manager & JSON      │
    │ • Profile & Streaks   │                     │   Question Importer   │
    └───────────────────────┘                     └───────────────────────┘
```

### 1. Learner Role (`learner`)
- **Access Scope**: `/`, `/auth`, `/dashboard`, `/exam`, `/workspaces`, `/wallet`, `/profile`
- **Features**:
  - **Onboarding Placement Quiz**: 10-question diagnostic test placing students into Beginner I or Intermediate I.
  - **Accountability Stake Tier**: ETB 1,000 deposit (900 ETB net stake locked) or 7-Day Free Trial Mode.
  - **Daily Learning Workspaces**: Seek-locked video lectures, category-based listening practice, 20-min tab-paused PDF document reader, and download PDF study guides.
  - **Daily Exam Runner**: 20-question timed diagnostic exam with instant scoring, pass/fail thresholds, and confetti rewards.
  - **Escrow Vault & Ledger**: Full transaction history recording deposits, stake protection rewards, penalties, and withdrawal requests.
  - **Deposit & Withdrawal Modals**: Chapa payment modal & bank account submission interface.

### 2. Administrator Role (`admin`)
- **Access Scope**: `/admin`, `/admin/learners`, `/admin/payment`, `/admin/curriculum`
- **Features**:
  - **Platform Financial Analytics**: Overview of Total Vault Pool Escrow, Active Enrolled Learners, Average Pass Rate, and Penalty Revenue.
  - **Learner Directory & Escrow Releases**: Searchable directory with level filters, streak monitoring, and withdrawal approval/decline modals.
  - **Payment & Bank Management**: Manage official platform deposit bank accounts and approve/decline manual deposit verification requests with receipt lightbox inspection.
  - **Curriculum Manager**: Complete 6-level module editor for assigned lesson YouTube videos, listening URLs, reference guides, PDF reading choices, and bulk JSON exam question importer.

---

## 🛠️ Complete Route Table

| Route | Component | Role Access | Purpose & Features |
| :--- | :--- | :--- | :--- |
| `/` | `LandingPage.jsx` | Public | Marketing landing page explaining financial accountability, 6-card interactive horizontal gallery, live metrics, and CTA. |
| `/auth` | `AuthPage.jsx` | Public / Learner | Authentication with prefilled test credentials, Google OAuth, 10-question placement quiz, and stake tier selection. |
| `/dashboard` | `LearnerDashboard.jsx` | Learner | Learner hub with real-time countdown timer, 4 daily task tracker, level progress ring, active streak badge, and escrow ledger preview. |
| `/exam` | `DailyExamRunner.jsx` | Learner | Timed 20-question diagnostic quiz runner, question navigation, score calculation, pass/fail state, and confetti celebration. |
| `/workspaces` | `LearningWorkspaces.jsx` | Learner | Tabbed study workspace supporting Task 1 (Lesson Video), Task 2 (Listening Practice), and Task 3 (20-Min Timed PDF Reader). |
| `/wallet` | `WalletPage.jsx` | Learner | Escrow vault summary (locked stake, penalties, available balance), Chapa top-up modal trigger, level settlement portal, and itemized transaction ledger. |
| `/profile` | `ProfilePage.jsx` | Learner | Learner profile summary displaying DiceBear avatar selector, level roadmap, verification status, active streak, and sign-out control. |
| `/admin` | `AdminDashboard.jsx` | Admin | Executive dashboard with platform KPIs (Vault Escrow, Active Learners, Pass Rate, Penalty Revenue), quick action shortcuts, and risk monitoring table. |
| `/admin/learners` | `AdminLearnersPage.jsx` | Admin | Learner directory with search & level filters, streak tracking, and withdrawal payout confirmation modal. |
| `/admin/payment` | `AdminPaymentManagement.jsx` | Admin | Deposit verification queue, decline reason inputs, receipt image lightbox, and bank account CRUD manager. |
| `/admin/curriculum` | `CurriculumManagement.jsx` | Admin | 6-level curriculum admin for managing daily lesson videos, listening URLs, reference books, PDF books, and bulk JSON question importer. |

---

## 🎨 Design Tokens & Theme Engine

Ethio-Lingo features a built-in light/dark theme engine with dynamic CSS design tokens:

- **Theme Context** (`src/context/ThemeContext.jsx`): Persistent `birrend_theme_preference` in `localStorage` toggles the `.dark` class on root `<html>`.
- **CSS Design Variables** (`src/index.css`):
  - `--bg-canvas`: `#faf9f5` (Light) / `#121110` (Dark)
  - `--bg-surface-lowest`: `#ffffff` (Light) / `#1c1a17` (Dark)
  - `--text-on-surface`: `#1b1c1a` (Light) / `#f5f4f0` (Dark)
  - `--border-hairline`: `#e6dfd8` (Light) / `#38332c` (Dark)
  - Core Brand Color: Warm Coral (`#8f482f` / `#d97453`), Amber Accent (`#e8a55a`), Streak Orange (`#ea580c`).
- **Global Micro-Interactions & Accessibility**:
  - `.focus-ring`: Accessible 2px focus ring (`:focus-visible`).
  - `.btn-interactive`: Micro-animations (`active:scale-[0.98] transition-all`).
  - `.animate-skeleton`: Shimmering pulse loading animation.
  - Mobile Responsiveness: Top navbar displays ONLY the hamburger button on mobile (`md:hidden`) which opens a unified mobile drawer menu.

---

## 💻 Tech Stack & System Architecture

### Frontend Stack
- **Framework**: React 19 + Vite 8
- **Routing**: React Router DOM v7
- **Styling**: Tailwind CSS v4 + Autoprefixer
- **Icons**: Lucide React
- **Animations**: Framer Motion + Canvas-Confetti
- **State Management**: React Context (`RoleContext`, `StakingContext`, `ThemeContext`)

### Backend Stack (`server/`)
- **Server Environment**: Node.js + Express
- **Database & Storage**: Supabase (PostgreSQL DB + Storage buckets for PDF books)
- **API Architecture**: REST API (`api.js` client)
- **Authentication**: JWT Tokens + Google OAuth + Clerk Scaffolding

---

## 📁 Project Structure

```
Birrend/
├── public/                 # Static public assets
├── src/
│   ├── components/         # Common UI components (Navbar, MobileNav, Footer, StreakBadge, CountdownWidget)
│   ├── context/            # React Contexts (RoleContext, StakingContext, ThemeContext)
│   ├── features/           # Feature Modules
│   │   ├── admin/          # Admin Dashboard, Directory, Payment Management, Curriculum Management
│   │   ├── auth/           # Auth Page, Placement Quiz, Auth Form, Payment Pending Lockout
│   │   ├── dashboard/      # Learner Dashboard & Metric Cards
│   │   ├── exam/           # Daily Exam Runner & Score Result Modal
│   │   ├── landing/        # Marketing Landing Page & Horizontal Scroll Gallery
│   │   ├── profile/        # Profile Page & DiceBear Avatar Modal
│   │   ├── wallet/         # Wallet Page, Chapa Modal, Ledger Table
│   │   └── workspaces/     # Learning Workspaces, Video Player, PDF Viewer
│   ├── services/           # REST API client scaffolding (api.js)
│   ├── utils/              # Helper functions (ETB currency & date formatters)
│   ├── App.jsx             # React Router definition and App shell layout
│   ├── index.css           # Tailwind CSS v4 tokens, dark mode variables & utility classes
│   └── main.jsx            # Entry point
├── server/                 # Express backend API & Supabase database integration
│   ├── src/                # Controllers, Routes, Models, Services
│   ├── package.json        # Backend dependencies
│   └── index.js            # Express server entry point
├── package.json            # Frontend dependencies & scripts
└── README.md               # System documentation
```

---

## ⚡ Getting Started & Local Development

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### Setup & Run Instructions

1. **Install Frontend Dependencies**:
   ```bash
   npm install
   ```

2. **Install Backend Dependencies**:
   ```bash
   cd server
   npm install
   cd ..
   ```

3. **Start Development Servers**:
   - Start the Vite frontend server (runs on `http://localhost:5173`):
     ```bash
     npm run dev
     ```
   - Start the Express backend server (in a separate terminal inside `server/`):
     ```bash
     cd server
     npm run dev
     ```

4. **Default Test Credentials**:
   - **Learner Account**: `learner@birrend.com` | Password: `learner123`
   - **Admin Account**: `admin@birrend.com` | Password: `admin123`

### Build & Lint Verification Commands

- **Production Build**:
  ```bash
  npm run build
  ```
- **Preview Build**:
  ```bash
  npm run preview
  ```
- **Run Linter**:
  ```bash
  npm run lint
  ```
