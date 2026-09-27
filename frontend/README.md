# ResolveHub MVP - Frontend

A clean, modern React + TypeScript frontend foundation for **ResolveHub**, an internal unified multi-department issue and ticket management system.

## 🚀 Key Features Built

1. **Application Shell & Layout**:
   - Fixed responsive Sidebar with real-time badges (My Tickets, Assigned Tickets, Notifications).
   - Sticky Navbar with unified Persona/Role switcher, notifications indicator, and profile quick access.
   - Clean professional internal-business UI following the ResolveHub MVP Architecture specification.

2. **Persona / Role Switching**:
   - Seamless demo switcher to test the unified interface from all perspectives:
     - **Alex Morgan** (`EMPLOYEE` - Finance)
     - **Sarah Jenkins** (`RESOLVER` - IT Support)
     - **Michael Chen** (`RESOLVER` - Human Resources)
     - **Sourabh Sharma** (`SUPER_ADMIN` - Administration)

3. **All 10 Required Pages & Views**:
   - **Login Page** (`/login`): Clean credential login with 1-click demo role sign-in buttons.
   - **Dashboard Page** (`/dashboard`): Unified Employee + Resolver dashboard with KPI stats, critical urgent issue alerts, lifecycle status filters, and recent ticket activity.
   - **Create Ticket Page** (`/create-ticket`): Ticket creation with auto-derived department from category (per Architecture design to prevent relational anomalies), priority selector, and OneDrive attachment simulation.
   - **My Tickets Page** (`/my-tickets`): Creator queue with live text search, status filters, priority filters, and table/card view switcher.
   - **Assigned To Me Page** (`/assigned-to-me`): Dedicated resolver worklist with quick status transitions (Start, Resolve), ticket transfer modal (BRD 6.4), and queue metrics.
   - **Ticket Details Page** (`/tickets/:id`): Complete ticket lifecycle management (Open → In Progress → Resolved → Closed), reopening workflow, user escalation/highlighting (BRD 6.6), internal notes toggle for staff, attachment management, and comment timeline.
   - **Notifications Page** (`/notifications`): Unread/All notification tracking, mark as read, and direct links to tickets.
   - **Profile Page** (`/profile`): Employee profile details, activity metrics, and interactive persona testing.

4. **Reusable Component Library**:
   - `Navbar`
   - `Sidebar`
   - `Button` (primary, secondary, danger, ghost variants with loading states & icons)
   - `Input` (floating icon, error, hint, required state)
   - `Select` (custom formatted options, placeholder)
   - `Modal` (accessible dialog with backdrop & Escape key dismissal)
   - `StatusBadge` (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`)
   - `PriorityBadge` (`LOW`, `MEDIUM`, `HIGH`, `URGENT`)
   - `TicketCard` (metadata chips, category info, attachment & comment counters)
   - `Table` (generic typed column renderer with interactive row click)

## 🛠️ Development & Running

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation
```bash
cd frontend
npm install
```

### Run Development Server
```bash
npm run dev
```
The application will launch at `http://localhost:3000`.

### Production Build
```bash
npm run build
```

## 📁 Architecture & Folder Structure
```
frontend/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── types/
    │   └── index.ts
    ├── mock/
    │   └── mockData.ts
    ├── context/
    │   ├── AuthContext.tsx
    │   └── TicketContext.tsx
    ├── components/
    │   ├── common/
    │   │   ├── Button.tsx
    │   │   ├── Input.tsx
    │   │   ├── Select.tsx
    │   │   ├── Modal.tsx
    │   │   ├── StatusBadge.tsx
    │   │   ├── PriorityBadge.tsx
    │   │   ├── TicketCard.tsx
    │   │   ├── Table.tsx
    │   │   └── index.ts
    │   └── layout/
    │       ├── AppLayout.tsx
    │       ├── Navbar.tsx
    │       └── Sidebar.tsx
    └── pages/
        ├── LoginPage.tsx
        ├── DashboardPage.tsx
        ├── CreateTicketPage.tsx
        ├── MyTicketsPage.tsx
        ├── AssignedToMePage.tsx
        ├── TicketDetailsPage.tsx
        ├── NotificationsPage.tsx
        └── ProfilePage.tsx
```
