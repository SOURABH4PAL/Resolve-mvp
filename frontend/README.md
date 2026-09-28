# ResolveHub MVP - Frontend

A clean, modern React + TypeScript frontend foundation for **ResolveHub**, an internal unified multi-department issue and ticket management system.

## 🚀 Key Features Built

1. **Dual Role Experience & Portals**:
   - **Super Admin Management Portal** (`/admin/*`):
     - **Admin Dashboard** (`/admin/dashboard`): Real-time metrics, workload distribution across employees, SLA health, escalation tracker, and system-wide KPI summary.
     - **Ticket Management** (`/admin/tickets`): Complete company-wide ticket ledger, filterable by department, category, priority, status, and responsible employee.
     - **Employee Directory & Responsibilities** (`/admin/employees`): Employee list with designated category responsibilities and active workload counters.
     - **Department Management** (`/admin/departments`): Department configuration with contact emails and status.
     - **Category & Subcategory Management** (`/admin/categories`): Categorization tree linked to responsible support staff.
     - **Responsibility & Routing** (`/admin/routing`): Configure Department → Category → Responsible Employee assignments and backup personnel.
     - **SLA & Escalation Policies** (`/admin/sla`): Response and resolution threshold configuration per priority.
     - **Activity & Audit Trail** (`/admin/activity`): System-wide security, lifecycle, and access log.
     - **FAQ / Knowledge Base** (`/admin/faq`): Internal resolutions repository.
     - **Reports & Analytics** (`/admin/reports`): Resolution trends, department efficiency, and volume stats.
     - **Settings & Profile** (`/admin/settings`): Admin profile and company-wide notification rules.
   - **Employee Support Portal** (`/employee/*`):
     - **Dashboard** (`/employee/dashboard`): Personalized dashboard showing submitted tickets, tickets assigned to me, and announcements.
     - **Create Ticket** (`/employee/create-ticket`): Intelligent ticket creation with category selection and automatic responsible employee assignment.
     - **My Tickets** (`/employee/my-tickets`): Personal tickets queue with real-time status and priority badges.
     - **Assigned To Me** (`/employee/assigned`): Support queue for employees designated to handle department categories, with quick lifecycle actions (Start, Resolve, Reopen) and reassignment.
     - **Notifications** (`/employee/notifications`): Lifecycle updates and comment alerts.
     - **Profile** (`/employee/profile`): Employee profile and quick role testing.

2. **Role & Demo Experience**:
   - **Interactive Live Role Switcher**: Switch between Super Admin and Employee view with one click directly in the top Navbar.
   - **Standalone Demo Resilience**: Works seamlessly offline without requiring a live backend, and automatically uses real FastAPI endpoints when the backend is active.

3. **Reusable Component Library**:
   - `Navbar`, `Sidebar`, `AppLayout`
   - `Button`, `Input`, `Select`, `Modal`, `StatusBadge`, `PriorityBadge`, `TicketCard`, `Table`

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
