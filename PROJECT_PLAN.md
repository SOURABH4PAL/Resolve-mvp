# ResolveHub MVP — PROJECT PLAN

> **Version:** 1.0  
> **Date:** 2026-09-26  
> **Source Documents:**
> - ResolveHub_Final_BRD_v1.0.docx (Business Requirements)
> - ResolveHub MVP Architecture.pdf (MVP Architecture)
> - ResolveHub_MVP_Task_Assignment.xlsx (Task Tracker)

---

## Document Conflict Resolution

The BRD defines 17+ database entities with full enterprise features (SLA, escalations, subcategories, routing rules, FAQs, audit logs, feedback). The Architecture PDF defines a simplified 7-table MVP. The Task Assignment spreadsheet assigns work covering BRD features (subcategories, routing, SLA, escalation, FAQs, history) that exceed the Architecture PDF's scope.

**Resolution:** The Task Assignment is the execution plan. The database and modules in this plan support all 36 assigned tasks. Where the Architecture PDF conflicts with the BRD/Task tracker, the BRD + Task tracker take precedence since the tasks are what each developer will actually build.

---

## 1. Final Project Architecture

```
┌──────────────────────────────────────────────────────┐
│                   FRONTEND                           │
│        HTML / CSS / JavaScript (Vanilla)             │
│  ┌──────────┐ ┌───────────┐ ┌──────────────────┐    │
│  │ Login    │ │ Unified   │ │ Admin Dashboard  │    │
│  │ Page     │ │ Dashboard │ │ (System Metrics) │    │
│  └──────────┘ └───────────┘ └──────────────────┘    │
│  ┌──────────┐ ┌───────────┐ ┌──────────────────┐    │
│  │ Ticket   │ │ FAQ       │ │ Notification     │    │
│  │ Pages    │ │ Pages     │ │ Panel            │    │
│  └──────────┘ └───────────┘ └──────────────────┘    │
└───────────────────┬──────────────────────────────────┘
                    │ REST API (JSON) + JWT Auth
┌───────────────────▼──────────────────────────────────┐
│                   BACKEND (FastAPI)                   │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────────┐  │
│  │ Auth   │ │ Ticket │ │ Admin  │ │ SLA/Escalate │  │
│  │ Router │ │ Router │ │ Router │ │ Router       │  │
│  └────────┘ └────────┘ └────────┘ └──────────────┘  │
│  ┌────────┐ ┌────────┐ ┌────────┐                    │
│  │ FAQ    │ │ Notif  │ │ Dash   │                    │
│  │ Router │ │ Router │ │ Router │                    │
│  └────────┘ └────────┘ └────────┘                    │
│            ┌───────────────────┐                      │
│            │  Service Layer    │                      │
│            │  (Business Logic) │                      │
│            └───────────────────┘                      │
│            ┌───────────────────┐                      │
│            │ SQLAlchemy Models │                      │
│            │  + Pydantic       │                      │
│            └────────┬──────────┘                      │
└─────────────────────┼────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────┐
│              PostgreSQL Database                      │
│              (Alembic Migrations)                     │
└──────────────────────────────────────────────────────┘
```

### Architecture Decisions

| Decision | Rationale |
|---|---|
| **Monorepo** with `backend/` and `frontend/` directories | Simplest setup for 3 students; one Git repo, one clone |
| **Frontend: Vanilla HTML/CSS/JS** (no framework) | BRD says "HTML/CSS/JavaScript or approved modern frontend framework"; plain JS is fastest for the team |
| **Backend: FastAPI + SQLAlchemy + Pydantic + Alembic** | Mandated by BRD |
| **Database: PostgreSQL** | Mandated by BRD |
| **File uploads: Local directory** (MVP) | BRD mentions OneDrive but MVP scope stores files locally with metadata; OneDrive integration is a post-MVP enhancement |
| **No WebSockets/real-time** | MVP uses polling or page refresh for notifications |
| **No email service** | Notifications are in-app only for MVP |
| **Docker for deployment** | BRD mandates containerization |

---

## 2. Folder Structure

```
resolvehub/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI app factory, CORS, startup
│   │   ├── config.py                # Settings via Pydantic BaseSettings
│   │   ├── database.py              # SQLAlchemy engine, SessionLocal, Base
│   │   ├── dependencies.py          # get_db, get_current_user, role checkers
│   │   │
│   │   ├── models/                  # SQLAlchemy ORM models
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── department.py
│   │   │   ├── support_team.py
│   │   │   ├── category.py
│   │   │   ├── subcategory.py
│   │   │   ├── routing_rule.py
│   │   │   ├── sla_policy.py
│   │   │   ├── ticket.py
│   │   │   ├── ticket_comment.py
│   │   │   ├── ticket_attachment.py
│   │   │   ├── ticket_status_history.py
│   │   │   ├── ticket_assignment.py
│   │   │   ├── ticket_escalation.py
│   │   │   ├── notification.py
│   │   │   ├── feedback.py
│   │   │   ├── faq.py
│   │   │   └── audit_log.py
│   │   │
│   │   ├── schemas/                 # Pydantic request/response models
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── user.py
│   │   │   ├── department.py
│   │   │   ├── support_team.py
│   │   │   ├── category.py
│   │   │   ├── subcategory.py
│   │   │   ├── routing_rule.py
│   │   │   ├── sla_policy.py
│   │   │   ├── ticket.py
│   │   │   ├── ticket_comment.py
│   │   │   ├── ticket_attachment.py
│   │   │   ├── escalation.py
│   │   │   ├── notification.py
│   │   │   ├── feedback.py
│   │   │   ├── faq.py
│   │   │   └── dashboard.py
│   │   │
│   │   ├── routers/                 # FastAPI APIRouter modules
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── tickets.py
│   │   │   ├── comments.py
│   │   │   ├── attachments.py
│   │   │   ├── departments.py
│   │   │   ├── support_teams.py
│   │   │   ├── categories.py
│   │   │   ├── subcategories.py
│   │   │   ├── routing_rules.py
│   │   │   ├── sla_policies.py
│   │   │   ├── escalations.py
│   │   │   ├── notifications.py
│   │   │   ├── feedback.py
│   │   │   ├── faqs.py
│   │   │   └── dashboard.py
│   │   │
│   │   ├── services/                # Business logic layer
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py
│   │   │   ├── ticket_service.py
│   │   │   ├── routing_service.py
│   │   │   ├── sla_service.py
│   │   │   ├── notification_service.py
│   │   │   └── escalation_service.py
│   │   │
│   │   └── utils/                   # Helpers
│   │       ├── __init__.py
│   │       ├── security.py          # Password hashing, JWT
│   │       └── ticket_number.py     # Unique ticket number generator
│   │
│   ├── alembic/                     # Alembic migration directory
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/
│   │
│   ├── uploads/                     # Local file upload directory (MVP)
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── index.html                   # Login page
│   ├── dashboard.html               # Unified employee/resolver dashboard
│   ├── admin.html                   # Admin dashboard
│   ├── create-ticket.html
│   ├── my-tickets.html
│   ├── ticket-detail.html
│   ├── assigned-tickets.html
│   ├── faq.html
│   ├── notifications.html
│   ├── profile.html
│   │
│   ├── admin/                       # Admin sub-pages
│   │   ├── users.html
│   │   ├── departments.html
│   │   ├── categories.html
│   │   ├── subcategories.html
│   │   ├── routing-rules.html
│   │   ├── sla-policies.html
│   │   ├── faqs-manage.html
│   │   └── ticket-monitor.html
│   │
│   ├── css/
│   │   └── style.css
│   │
│   ├── js/
│   │   ├── api.js                   # Fetch wrapper, token management
│   │   ├── auth.js                  # Login/logout logic
│   │   ├── dashboard.js
│   │   ├── tickets.js
│   │   ├── ticket-detail.js
│   │   ├── comments.js
│   │   ├── notifications.js
│   │   ├── faq.js
│   │   ├── admin.js
│   │   └── utils.js                 # Date formatting, DOM helpers
│   │
│   └── Dockerfile                   # Nginx to serve static files
│
├── docker-compose.yml               # PostgreSQL + Backend + Frontend
├── .gitignore
├── .env.example
├── seed_data.py                     # Seed script for demo data
└── README.md
```

---

## 3. Database Entities and Relationships

### 3.1 Entity List (17 Tables)

| # | Table | Purpose | Owner Module |
|---|---|---|---|
| 1 | `users` | All user accounts (employee, resolver, super_admin) | M1 (Sourabh) |
| 2 | `departments` | Organizational departments | M4 (Saksham) |
| 3 | `support_teams` | Teams within departments that handle tickets | M4 (Saksham) |
| 4 | `support_team_members` | Junction: user <-> support_team membership | M4 (Saksham) |
| 5 | `categories` | Ticket categories under departments | M4 (Saksham) |
| 6 | `subcategories` | Sub-categories under categories | M4 (Saksham) |
| 7 | `routing_rules` | Maps subcategory -> support_team + default priority + SLA policy | M4 (Saksham) |
| 8 | `sla_policies` | Defines response/resolution time targets | M5 (Aditya) |
| 9 | `tickets` | Core ticket entity | M2 (Sourabh) |
| 10 | `ticket_comments` | Public comments and internal notes on tickets | M2 (Sourabh) |
| 11 | `ticket_attachments` | File metadata for uploaded documents | M2 (Sourabh) |
| 12 | `ticket_status_history` | Log of every status change | M6 (Aditya) |
| 13 | `ticket_assignments` | Log of every assignment/transfer | M3 (Saksham) |
| 14 | `ticket_escalations` | User highlights and SLA-breach escalations | M5 (Aditya) |
| 15 | `notifications` | In-app notification records | M5 (Aditya) |
| 16 | `faqs` | FAQ / knowledge base entries | M6 (Aditya) |
| 17 | `feedback` | Post-resolution user feedback | M3 (Saksham) |

> **Note:** Audit logs (BRD entity #17) are deferred to post-MVP. The ticket_status_history + ticket_assignments tables cover the critical audit trail for the MVP. A general `audit_logs` table can be added later.

### 3.2 Entity Details

#### `users`
```
id              UUID        PK, default uuid4
employee_id     VARCHAR(50) UNIQUE, NOT NULL
name            VARCHAR(100) NOT NULL
email           VARCHAR(255) UNIQUE, NOT NULL
password_hash   VARCHAR(255) NOT NULL
role            ENUM('EMPLOYEE','RESOLVER','SUPER_ADMIN') NOT NULL
department_id   UUID        FK -> departments.id, NULLABLE
is_active       BOOLEAN     DEFAULT TRUE
created_at      TIMESTAMP   DEFAULT NOW
updated_at      TIMESTAMP   DEFAULT NOW, ON UPDATE NOW
```

#### `departments`
```
id              UUID        PK
name            VARCHAR(100) UNIQUE, NOT NULL
department_email VARCHAR(255) NULLABLE
is_active       BOOLEAN     DEFAULT TRUE
created_at      TIMESTAMP   DEFAULT NOW
updated_at      TIMESTAMP   DEFAULT NOW
```

#### `support_teams`
```
id              UUID        PK
name            VARCHAR(100) NOT NULL
department_id   UUID        FK -> departments.id, NOT NULL
is_active       BOOLEAN     DEFAULT TRUE
created_at      TIMESTAMP   DEFAULT NOW
updated_at      TIMESTAMP   DEFAULT NOW
```

#### `support_team_members`
```
id              UUID        PK
team_id         UUID        FK -> support_teams.id, NOT NULL
user_id         UUID        FK -> users.id, NOT NULL
is_active       BOOLEAN     DEFAULT TRUE
joined_at       TIMESTAMP   DEFAULT NOW
UNIQUE(team_id, user_id)
```

#### `categories`
```
id              UUID        PK
department_id   UUID        FK -> departments.id, NOT NULL
name            VARCHAR(100) NOT NULL
description     TEXT        NULLABLE
is_active       BOOLEAN     DEFAULT TRUE
created_at      TIMESTAMP   DEFAULT NOW
updated_at      TIMESTAMP   DEFAULT NOW
```

#### `subcategories`
```
id              UUID        PK
category_id     UUID        FK -> categories.id, NOT NULL
name            VARCHAR(100) NOT NULL
description     TEXT        NULLABLE
is_active       BOOLEAN     DEFAULT TRUE
created_at      TIMESTAMP   DEFAULT NOW
updated_at      TIMESTAMP   DEFAULT NOW
```

#### `routing_rules`
```
id              UUID        PK
subcategory_id  UUID        FK -> subcategories.id, NOT NULL
support_team_id UUID        FK -> support_teams.id, NOT NULL
sla_policy_id   UUID        FK -> sla_policies.id, NULLABLE
default_priority ENUM('LOW','MEDIUM','HIGH','CRITICAL') DEFAULT 'MEDIUM'
is_active       BOOLEAN     DEFAULT TRUE
created_at      TIMESTAMP   DEFAULT NOW
updated_at      TIMESTAMP   DEFAULT NOW
```

#### `sla_policies`
```
id                      UUID        PK
name                    VARCHAR(100) NOT NULL
first_response_hours    INTEGER     NOT NULL
resolution_hours        INTEGER     NOT NULL
is_active               BOOLEAN     DEFAULT TRUE
created_at              TIMESTAMP   DEFAULT NOW
updated_at              TIMESTAMP   DEFAULT NOW
```

#### `tickets`
```
id                  UUID        PK
ticket_number       VARCHAR(20) UNIQUE, NOT NULL  (e.g., "TKT-000001")
title               VARCHAR(255) NOT NULL
description         TEXT        NOT NULL
created_by          UUID        FK -> users.id, NOT NULL
category_id         UUID        FK -> categories.id, NOT NULL
subcategory_id      UUID        FK -> subcategories.id, NULLABLE
assigned_team_id    UUID        FK -> support_teams.id, NULLABLE
assigned_to         UUID        FK -> users.id, NULLABLE
priority            ENUM('LOW','MEDIUM','HIGH','CRITICAL') DEFAULT 'MEDIUM'
status              ENUM('OPEN','ASSIGNED','IN_PROGRESS','WAITING_FOR_USER',
                         'RESOLVED','CLOSED','REOPENED') DEFAULT 'OPEN'
sla_policy_id       UUID        FK -> sla_policies.id, NULLABLE
response_due_at     TIMESTAMP   NULLABLE
resolution_due_at   TIMESTAMP   NULLABLE
first_responded_at  TIMESTAMP   NULLABLE
resolved_at         TIMESTAMP   NULLABLE
closed_at           TIMESTAMP   NULLABLE
created_at          TIMESTAMP   DEFAULT NOW
updated_at          TIMESTAMP   DEFAULT NOW
```

> **Design Decision (from Architecture PDF):** Department is NOT stored on the ticket. Department is derived via `Ticket -> Category -> Department`.

#### `ticket_comments`
```
id              UUID        PK
ticket_id       UUID        FK -> tickets.id, NOT NULL
user_id         UUID        FK -> users.id, NOT NULL
content         TEXT        NOT NULL
is_internal     BOOLEAN     DEFAULT FALSE  (internal notes hidden from employees)
created_at      TIMESTAMP   DEFAULT NOW
updated_at      TIMESTAMP   DEFAULT NOW
```

#### `ticket_attachments`
```
id              UUID        PK
ticket_id       UUID        FK -> tickets.id, NOT NULL
uploaded_by     UUID        FK -> users.id, NOT NULL
file_name       VARCHAR(255) NOT NULL
file_path       VARCHAR(500) NOT NULL  (local path or OneDrive reference)
file_size       BIGINT      NOT NULL
mime_type       VARCHAR(100) NULLABLE
created_at      TIMESTAMP   DEFAULT NOW
```

#### `ticket_status_history`
```
id              UUID        PK
ticket_id       UUID        FK -> tickets.id, NOT NULL
old_status      VARCHAR(30) NULLABLE
new_status      VARCHAR(30) NOT NULL
changed_by      UUID        FK -> users.id, NOT NULL
reason          TEXT        NULLABLE
created_at      TIMESTAMP   DEFAULT NOW
```

#### `ticket_assignments`
```
id              UUID        PK
ticket_id       UUID        FK -> tickets.id, NOT NULL
assigned_from   UUID        FK -> users.id, NULLABLE  (previous resolver)
assigned_to     UUID        FK -> users.id, NULLABLE  (new resolver)
assigned_team   UUID        FK -> support_teams.id, NULLABLE
assigned_by     UUID        FK -> users.id, NOT NULL  (who performed the action)
reason          TEXT        NULLABLE  (transfer reason)
created_at      TIMESTAMP   DEFAULT NOW
```

#### `ticket_escalations`
```
id              UUID        PK
ticket_id       UUID        FK -> tickets.id, NOT NULL
escalation_type ENUM('USER_HIGHLIGHT','SLA_BREACH','ADMIN') NOT NULL
raised_by       UUID        FK -> users.id, NOT NULL
reason          TEXT        NULLABLE
status          ENUM('OPEN','ACKNOWLEDGED','RESOLVED','CANCELLED') DEFAULT 'OPEN'
created_at      TIMESTAMP   DEFAULT NOW
updated_at      TIMESTAMP   DEFAULT NOW
```

#### `notifications`
```
id              UUID        PK
user_id         UUID        FK -> users.id, NOT NULL
title           VARCHAR(255) NOT NULL
message         TEXT        NOT NULL
ticket_id       UUID        FK -> tickets.id, NULLABLE
is_read         BOOLEAN     DEFAULT FALSE
created_at      TIMESTAMP   DEFAULT NOW
```

#### `faqs`
```
id              UUID        PK
department_id   UUID        FK -> departments.id, NULLABLE
category_id     UUID        FK -> categories.id, NULLABLE
question        VARCHAR(500) NOT NULL
answer          TEXT        NOT NULL
is_published    BOOLEAN     DEFAULT FALSE
created_by      UUID        FK -> users.id, NOT NULL
created_at      TIMESTAMP   DEFAULT NOW
updated_at      TIMESTAMP   DEFAULT NOW
```

#### `feedback`
```
id              UUID        PK
ticket_id       UUID        FK -> tickets.id, UNIQUE, NOT NULL
user_id         UUID        FK -> users.id, NOT NULL
rating          INTEGER     NOT NULL  (1-5)
comment         TEXT        NULLABLE
created_at      TIMESTAMP   DEFAULT NOW
```

### 3.3 Entity Relationship Diagram

```
DEPARTMENTS ──┬── has many ──> CATEGORIES
              ├── has many ──> SUPPORT_TEAMS
              ├── has many ──> USERS (belongs to)
              └── has many ──> FAQS

CATEGORIES ───┬── has many ──> SUBCATEGORIES
              ├── has many ──> TICKETS
              └── has many ──> FAQS

SUBCATEGORIES ── has many ──> ROUTING_RULES

SUPPORT_TEAMS ─┬── has many ──> ROUTING_RULES
               └── has many ──> SUPPORT_TEAM_MEMBERS

USERS ─────────┬── member of ─> SUPPORT_TEAM_MEMBERS
               ├── creates ───> TICKETS
               ├── assigned ──> TICKETS
               ├── writes ────> TICKET_COMMENTS
               ├── uploads ───> TICKET_ATTACHMENTS
               ├── receives ──> NOTIFICATIONS
               └── gives ─────> FEEDBACK

TICKETS ───────┬── has many ──> TICKET_COMMENTS
               ├── has many ──> TICKET_ATTACHMENTS
               ├── has many ──> TICKET_STATUS_HISTORY
               ├── has many ──> TICKET_ASSIGNMENTS
               ├── has many ──> TICKET_ESCALATIONS
               ├── has one ───> FEEDBACK
               └── generates ─> NOTIFICATIONS

SLA_POLICIES ──┬── applied via > ROUTING_RULES
               └── governs ───> TICKETS
```

---

## 4. Backend Modules

Each module maps to a router + service layer. Models and schemas are shared.

| Module | Router File | Service File | Key Responsibilities |
|---|---|---|---|
| **Auth** | `routers/auth.py` | `services/auth_service.py` | Login, JWT token issue/verify, password hashing |
| **Users** | `routers/users.py` | -- | Profile view/edit, admin user CRUD, role assignment |
| **Tickets** | `routers/tickets.py` | `services/ticket_service.py` | Create, list, get, update status/priority, reopen, close |
| **Comments** | `routers/comments.py` | -- | Add/list public comments & internal notes |
| **Attachments** | `routers/attachments.py` | -- | Upload/download files, store metadata |
| **Departments** | `routers/departments.py` | -- | Admin CRUD for departments |
| **Support Teams** | `routers/support_teams.py` | -- | Admin CRUD for teams + member management |
| **Categories** | `routers/categories.py` | -- | Admin CRUD for categories |
| **Subcategories** | `routers/subcategories.py` | -- | Admin CRUD for subcategories |
| **Routing Rules** | `routers/routing_rules.py` | `services/routing_service.py` | Admin CRUD for rules, auto-route on ticket creation |
| **SLA Policies** | `routers/sla_policies.py` | `services/sla_service.py` | Admin CRUD for SLA, calculate due timestamps, detect breaches |
| **Escalations** | `routers/escalations.py` | `services/escalation_service.py` | User highlight, SLA breach records, status transitions |
| **Notifications** | `routers/notifications.py` | `services/notification_service.py` | Create/list/mark-read notifications, triggered by events |
| **Feedback** | `routers/feedback.py` | -- | Submit/view post-resolution feedback |
| **FAQs** | `routers/faqs.py` | -- | Admin CRUD, user browse/search |
| **Dashboard** | `routers/dashboard.py` | -- | Aggregated counts and metrics per role |

---

## 5. Frontend Modules

| Page | File | Description | Developer |
|---|---|---|---|
| **Login** | `index.html` + `js/auth.js` | Email/password form, JWT storage, redirect by role | Sourabh |
| **Dashboard** | `dashboard.html` + `js/dashboard.js` | Unified employee + resolver view: ticket counts, recent tickets | Aditya |
| **Create Ticket** | `create-ticket.html` + `js/tickets.js` | Form: dept -> category -> subcategory cascade, title, desc, priority, attachments | Sourabh |
| **My Tickets** | `my-tickets.html` + `js/tickets.js` | List of user's own tickets with status filters | Sourabh |
| **Ticket Detail** | `ticket-detail.html` + `js/ticket-detail.js` | Full ticket view: info, status, comments, attachments, history, escalation, feedback | Sourabh + Saksham |
| **Assigned Tickets** | `assigned-tickets.html` + `js/tickets.js` | Resolver view: tickets assigned to me/my team | Saksham |
| **FAQ Browse** | `faq.html` + `js/faq.js` | Browse/search FAQs by dept/category/keyword | Aditya |
| **Notifications** | `notifications.html` + `js/notifications.js` | List notifications, mark read | Aditya |
| **Profile** | `profile.html` + `js/auth.js` | View/edit profile, logout | Sourabh |
| **Admin Dashboard** | `admin.html` + `js/admin.js` | System-wide stats, ticket metrics | Aditya |
| **Admin: Users** | `admin/users.html` | User list, create, edit, deactivate, role assign | Saksham |
| **Admin: Departments** | `admin/departments.html` | CRUD departments | Saksham |
| **Admin: Categories** | `admin/categories.html` | CRUD categories | Saksham |
| **Admin: Subcategories** | `admin/subcategories.html` | CRUD subcategories | Saksham |
| **Admin: Routing Rules** | `admin/routing-rules.html` | Configure routing | Saksham |
| **Admin: SLA** | `admin/sla-policies.html` | Configure SLA policies | Aditya |
| **Admin: FAQs** | `admin/faqs-manage.html` | CRUD FAQ entries | Aditya |
| **Admin: Ticket Monitor** | `admin/ticket-monitor.html` | View/assign all tickets | Saksham |

### Shared JS Module: `js/api.js`

```
- BASE_URL constant
- getToken() / setToken() / removeToken() -- localStorage
- apiGet(url), apiPost(url, body), apiPut(url, body), apiDelete(url)
  -> Automatically attaches Authorization: Bearer <token>
  -> Handles 401 by redirecting to login
- redirectByRole(role) -- route to correct dashboard after login
```

---

## 6. API Endpoint List

### 6.1 Auth
| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/auth/login` | Login, returns JWT + user info | Public |
| GET | `/api/auth/me` | Get current user from token | Authenticated |

### 6.2 Users
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/users/me` | Get own profile | Authenticated |
| PUT | `/api/users/me` | Update own profile | Authenticated |
| GET | `/api/users` | List all users | Admin |
| POST | `/api/users` | Create user | Admin |
| GET | `/api/users/{id}` | Get user detail | Admin |
| PUT | `/api/users/{id}` | Update user (role, active) | Admin |

### 6.3 Departments
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/departments` | List departments | Authenticated |
| POST | `/api/departments` | Create department | Admin |
| PUT | `/api/departments/{id}` | Update department | Admin |

### 6.4 Support Teams
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/support-teams` | List teams (filter by dept) | Authenticated |
| POST | `/api/support-teams` | Create team | Admin |
| PUT | `/api/support-teams/{id}` | Update team | Admin |
| POST | `/api/support-teams/{id}/members` | Add member | Admin |
| DELETE | `/api/support-teams/{id}/members/{user_id}` | Remove member | Admin |
| GET | `/api/support-teams/{id}/members` | List members | Authenticated |

### 6.5 Categories
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/categories` | List categories (filter by dept) | Authenticated |
| POST | `/api/categories` | Create category | Admin |
| PUT | `/api/categories/{id}` | Update category | Admin |

### 6.6 Subcategories
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/subcategories` | List (filter by category) | Authenticated |
| POST | `/api/subcategories` | Create | Admin |
| PUT | `/api/subcategories/{id}` | Update | Admin |

### 6.7 Routing Rules
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/routing-rules` | List rules (filter by subcategory) | Admin |
| POST | `/api/routing-rules` | Create rule | Admin |
| PUT | `/api/routing-rules/{id}` | Update rule | Admin |

### 6.8 SLA Policies
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/sla-policies` | List policies | Admin |
| POST | `/api/sla-policies` | Create policy | Admin |
| PUT | `/api/sla-policies/{id}` | Update policy | Admin |

### 6.9 Tickets
| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/tickets` | Create ticket | Authenticated |
| GET | `/api/tickets` | List tickets (own or assigned, filter by status/priority) | Authenticated |
| GET | `/api/tickets/{id}` | Get ticket detail | Owner/Assigned/Admin |
| PUT | `/api/tickets/{id}/status` | Update status | Resolver/Admin |
| PUT | `/api/tickets/{id}/priority` | Update priority | Resolver/Admin |
| PUT | `/api/tickets/{id}/assign` | Assign/transfer to resolver/team | Resolver/Admin |
| PUT | `/api/tickets/{id}/reopen` | Reopen resolved ticket | Owner |
| PUT | `/api/tickets/{id}/close` | Close ticket | Owner/Resolver/Admin |
| GET | `/api/tickets/all` | Admin: list all tickets | Admin |

### 6.10 Comments
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/tickets/{id}/comments` | List comments (filter internal based on role) | Ticket access |
| POST | `/api/tickets/{id}/comments` | Add comment/internal note | Ticket access |

### 6.11 Attachments
| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/tickets/{id}/attachments` | Upload file | Ticket access |
| GET | `/api/tickets/{id}/attachments` | List attachments | Ticket access |
| GET | `/api/attachments/{id}/download` | Download file | Ticket access |

### 6.12 Escalations
| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/tickets/{id}/escalate` | User highlight/escalate | Ticket owner |
| GET | `/api/tickets/{id}/escalations` | List escalations for ticket | Ticket access |
| PUT | `/api/escalations/{id}` | Update escalation status | Resolver/Admin |

### 6.13 Notifications
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/notifications` | List own notifications | Authenticated |
| PUT | `/api/notifications/{id}/read` | Mark as read | Owner |
| GET | `/api/notifications/unread-count` | Get unread count | Authenticated |

### 6.14 Feedback
| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/tickets/{id}/feedback` | Submit feedback | Ticket owner |
| GET | `/api/tickets/{id}/feedback` | Get feedback | Ticket access |

### 6.15 FAQs
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/faqs` | Browse/search published FAQs | Authenticated |
| POST | `/api/faqs` | Create FAQ | Admin |
| PUT | `/api/faqs/{id}` | Update FAQ | Admin |
| DELETE | `/api/faqs/{id}` | Deactivate FAQ | Admin |

### 6.16 Dashboard
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/dashboard/user` | User stats: own ticket counts | Authenticated |
| GET | `/api/dashboard/resolver` | Resolver stats: assigned, team, SLA breach counts | Resolver |
| GET | `/api/dashboard/admin` | Admin stats: system-wide metrics | Admin |

### 6.17 History
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/tickets/{id}/history` | Status + assignment history | Ticket access |

---

## 7. Authentication & Authorization Approach

### 7.1 Authentication: JWT Bearer Tokens

```
1. User POSTs email + password to /api/auth/login
2. Backend verifies password hash (bcrypt via passlib)
3. Backend issues a JWT (python-jose) with payload:
   {
     "sub": "<user_id>",
     "role": "EMPLOYEE|RESOLVER|SUPER_ADMIN",
     "exp": <expiry_timestamp>
   }
4. Frontend stores JWT in localStorage
5. Every API request includes header: Authorization: Bearer <token>
6. Backend dependency (get_current_user) decodes + validates JWT on every protected route
```

### 7.2 Authorization: Role-Based Access Control

Three levels, enforced via FastAPI dependencies:

```python
# dependencies.py

def get_current_user(token, db):
    """Decode JWT, fetch user from DB, return user object."""

def require_role(*roles):
    """Returns a dependency that checks current_user.role is in allowed roles."""

# Usage in routers:
@router.post("/departments", dependencies=[Depends(require_role("SUPER_ADMIN"))])
```

| Check | Implementation |
|---|---|
| **Is authenticated?** | `get_current_user` dependency on every protected route |
| **Is admin?** | `require_role("SUPER_ADMIN")` |
| **Is resolver or admin?** | `require_role("RESOLVER", "SUPER_ADMIN")` |
| **Is ticket owner?** | Service-level check: `ticket.created_by == current_user.id` |
| **Is assigned resolver?** | Service-level check: `ticket.assigned_to == current_user.id` |
| **Internal notes hidden** | Query filter: if role == EMPLOYEE, filter out `is_internal=True` comments |

### 7.3 Password Storage
- Hash with **bcrypt** via `passlib`
- Never store or return plaintext passwords

### 7.4 Initial Super Admin
- Seeded via `seed_data.py` script (not exposed as a self-registration endpoint)
- Default credentials printed to console on first run

---

## 8. Git/GitHub Development Strategy

### 8.1 Repository Setup

```
Repository: resolvehub (private GitHub repo)
Default branch: main (protected -- no direct pushes)
```

### 8.2 Branch Strategy

```
main (stable, deployable)
  └── dev (integration branch)
        ├── sourabh/m1-auth
        ├── sourabh/m2-tickets
        ├── saksham/m3-assignment
        ├── saksham/m4-admin
        ├── aditya/m5-sla-notifications
        └── aditya/m6-faq-dashboard
```

| Branch | Purpose | Who merges |
|---|---|---|
| `main` | Stable, deployable code | Sourabh (after team review) |
| `dev` | Integration branch -- all features merge here first | Any member via PR |
| `sourabh/<task-id>` | Sourabh's feature branches (M1, M2) | Sourabh -> dev |
| `saksham/<task-id>` | Saksham's feature branches (M3, M4) | Saksham -> dev |
| `aditya/<task-id>` | Aditya's feature branches (M5, M6) | Aditya -> dev |

### 8.3 Workflow Rules

1. **Never push directly to `main` or `dev`** -- always create a feature branch
2. **Branch naming:** `<name>/<module-id>-<short-description>` (e.g., `sourabh/m1-login-api`)
3. **Pull before push:** Always `git pull origin dev` before creating a branch
4. **Pull Requests:** Create a PR from feature branch -> `dev`; at least one other team member reviews
5. **Commit messages:** `[M1-F1-T1] Build login UI with validation` (use the task ID from the tracker)
6. **Merge conflicts:** The person who created the PR resolves conflicts
7. **Daily merge cadence:** Merge completed work to `dev` at least once per day to reduce conflicts

### 8.4 `.gitignore`

```
# Python
__pycache__/
*.pyc
.env
venv/
*.egg-info/

# Uploads
backend/uploads/*
!backend/uploads/.gitkeep

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Docker
*.log
```

---

## 9. Local Development Setup

### 9.1 Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Python | 3.10+ | Backend runtime |
| PostgreSQL | 14+ | Database |
| Git | Latest | Version control |
| Docker + Docker Compose | Latest | Containerized deployment |
| VS Code (recommended) | Latest | IDE |

### 9.2 Quick Start (without Docker)

```bash
# 1. Clone the repo
git clone https://github.com/<org>/resolvehub.git
cd resolvehub

# 2. Create and activate virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 3. Install backend dependencies
cd backend
pip install -r requirements.txt

# 4. Create PostgreSQL database
# In psql:
# CREATE DATABASE resolvehub;
# CREATE USER resolvehub_user WITH PASSWORD 'resolvehub_pass';
# GRANT ALL PRIVILEGES ON DATABASE resolvehub TO resolvehub_user;

# 5. Set up environment
cp .env.example .env
# Edit .env with your database credentials

# 6. Run Alembic migrations
alembic upgrade head

# 7. Seed initial data
python ../seed_data.py

# 8. Start backend server
uvicorn app.main:app --reload --port 8000

# 9. Open frontend
# Simply open frontend/index.html in a browser
# OR use Python's built-in server:
cd ../frontend
python -m http.server 3000
```

### 9.3 Quick Start (with Docker)

```bash
# 1. Clone and enter project
git clone https://github.com/<org>/resolvehub.git
cd resolvehub

# 2. Copy environment file
cp .env.example .env

# 3. Start everything
docker-compose up --build

# Backend: http://localhost:8000
# Frontend: http://localhost:3000
# PostgreSQL: localhost:5432
```

### 9.4 `.env.example`

```env
# Database
DATABASE_URL=postgresql://resolvehub_user:resolvehub_pass@localhost:5432/resolvehub

# JWT
SECRET_KEY=change-this-to-a-random-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=480

# App
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_MB=10
```

### 9.5 `requirements.txt`

```
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
alembic==1.13.1
psycopg2-binary==2.9.9
pydantic[email]==2.5.3
pydantic-settings==2.1.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
```

---

## 10. Deployment Approach

### 10.1 Docker Compose (MVP Deployment)

```yaml
# docker-compose.yml (structure)
services:
  db:
    image: postgres:14
    environment:
      POSTGRES_DB: resolvehub
      POSTGRES_USER: resolvehub_user
      POSTGRES_PASSWORD: resolvehub_pass
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://resolvehub_user:resolvehub_pass@db:5432/resolvehub
    depends_on:
      - db
    ports:
      - "8000:8000"
    volumes:
      - ./backend/uploads:/app/uploads

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  pgdata:
```

### 10.2 Backend Dockerfile

```dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p /app/uploads
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
```

### 10.3 Frontend Dockerfile

```dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### 10.4 Frontend Nginx Config

```nginx
# frontend/nginx.conf
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://backend:8000/api/;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 10.5 Deployment Steps

```
1. Push final code to main branch
2. SSH into server (or use cloud VM)
3. git clone / git pull
4. docker-compose up -d --build
5. Access on server IP: port 3000 (frontend) / port 8000 (API docs at /docs)
```

> For the 2-day MVP, local Docker Compose is the deployment target. Cloud deployment (AWS/GCP/Azure) is post-MVP.

---

## 11. Exact Implementation Order

**Critical path:** Auth -> Database models -> Ticket CRUD -> Assignment -> Admin panels -> SLA/Escalation -> FAQ/Dashboard.

Sourabh's M1 (Auth) is a **hard blocker** for everyone else. It must be completed first (or at least the core login API and `get_current_user` dependency).

### Phase 0: Project Setup (All three -- first 2 hours)

| Step | Task | Who | Duration |
|---|---|---|---|
| 0.1 | Create GitHub repo, clone, create `dev` branch | Sourabh | 15 min |
| 0.2 | Set up folder structure (as defined above) | Sourabh | 30 min |
| 0.3 | Set up `backend/requirements.txt`, `config.py`, `database.py`, `main.py` | Sourabh | 30 min |
| 0.4 | Create ALL SQLAlchemy models (all 17 tables) | All three split models | 45 min |
| 0.5 | Initialize Alembic, generate first migration, test migrate | Sourabh | 15 min |
| 0.6 | Create `seed_data.py` with admin user + sample departments | Sourabh | 15 min |
| 0.7 | Create shared `frontend/js/api.js` and `frontend/css/style.css` | Sourabh | 15 min |
| 0.8 | Push to `dev`, everyone pulls | All | 5 min |

### Phase 1: Auth Foundation (Sourabh -- blocks everyone)

| Step | Task ID | Task | Duration |
|---|---|---|---|
| 1.1 | M1-F1-T2 | Login API: `/api/auth/login` with JWT | 2 hr |
| 1.2 | M1-F1-T3 | `get_current_user`, `require_role` dependencies | 1 hr |
| 1.3 | M1-F1-T1 | Login UI page (`index.html` + `auth.js`) | 1.5 hr |
| 1.4 | M1-F2-T1 | Profile view/edit UI + API | 1 hr |
| 1.5 | M1-F2-T2 | Role-based permission checks tested | 0.5 hr |
| 1.6 | M1-F2-T3 | User active/inactive handling | 0.5 hr |
| -- | -- | **Merge to dev. Saksham & Aditya pull.** | -- |

> **IMPORTANT:** Saksham and Aditya should work on their **database models** and **Pydantic schemas** in parallel during Phase 1, but they cannot test API routes until auth is merged.

### Phase 2: Core Ticket Flow + Admin + SLA (All three in parallel)

All three work in parallel after Phase 1 merge.

#### Sourabh -- Ticket Management (M2)

| Step | Task ID | Task | Duration |
|---|---|---|---|
| 2S.1 | M2-F1-T2 | Ticket creation API with unique number, validation, routing | 2 hr |
| 2S.2 | M2-F1-T1 | Create ticket UI (dept -> category -> subcategory cascade) | 2 hr |
| 2S.3 | M2-F1-T3 | Attachment upload API + UI | 1.5 hr |
| 2S.4 | M2-F2-T1 | My Tickets list + ticket detail UI | 2 hr |
| 2S.5 | M2-F2-T2 | Comments API + UI (public + internal notes) | 1.5 hr |
| 2S.6 | M2-F2-T3 | Status/priority update API visible to permitted users | 1 hr |

#### Saksham -- Admin & Assignment (M3 + M4)

| Step | Task ID | Task | Duration |
|---|---|---|---|
| 2K.1 | M4-F1-T2 | Department CRUD API + admin UI | 1.5 hr |
| 2K.2 | M4-F1-T1 | User management API + admin UI | 2 hr |
| 2K.3 | M4-F1-T3 | Support team + membership API + UI | 1.5 hr |
| 2K.4 | M4-F2-T1 | Category + subcategory CRUD API + admin UI | 2 hr |
| 2K.5 | M4-F2-T2 | Routing rule config API + admin UI | 1.5 hr |
| 2K.6 | M3-F1-T1 | Routing service: auto-assign team on ticket creation | 1.5 hr |
| 2K.7 | M3-F1-T2 | Assigned tickets view for resolver | 1.5 hr |
| 2K.8 | M3-F1-T3 | Assignment/transfer history recording | 1 hr |
| 2K.9 | M3-F2-T1 | Status flow enforcement (valid transitions) | 1 hr |
| 2K.10 | M3-F2-T2 | Transfer wrongly assigned ticket + reason | 1 hr |
| 2K.11 | M3-F2-T3 | Resolution, reopen, closure workflow | 1 hr |
| 2K.12 | M4-F2-T3 | Admin ticket monitor + manual assignment UI | 1 hr |

#### Aditya -- SLA, Notifications, FAQ, Dashboard (M5 + M6)

| Step | Task ID | Task | Duration |
|---|---|---|---|
| 2A.1 | M5-F1-T1 | SLA policy CRUD API + admin UI | 1.5 hr |
| 2A.2 | M5-F1-T2 | Due timestamp calculation + breach detection logic | 2 hr |
| 2A.3 | M5-F1-T3 | User highlight/escalation API + UI | 1.5 hr |
| 2A.4 | M5-F2-T1 | Notification creation service (assignment, status, escalation events) | 2 hr |
| 2A.5 | M5-F2-T2 | Notification list UI with read/unread | 1.5 hr |
| 2A.6 | M5-F2-T3 | Wire notification triggers into ticket workflow | 1 hr |
| 2A.7 | M6-F1-T1 | FAQ admin CRUD API + UI | 1.5 hr |
| 2A.8 | M6-F1-T2 | FAQ browse/search user UI | 1 hr |
| 2A.9 | M6-F1-T3 | FAQ access alongside ticket creation | 0.5 hr |
| 2A.10 | M6-F2-T1 | Status + assignment history API | 1 hr |
| 2A.11 | M6-F2-T2 | User/resolver dashboard with counts | 1.5 hr |
| 2A.12 | M6-F2-T3 | Admin dashboard with system metrics | 1.5 hr |

### Phase 3: Integration & Testing (All -- last 3-4 hours)

| Step | Task | Who | Duration |
|---|---|---|---|
| 3.1 | Merge all features to `dev` | All | 30 min |
| 3.2 | End-to-end test: create ticket -> assign -> comment -> resolve -> close -> feedback | All | 1 hr |
| 3.3 | Test admin workflows: create dept -> category -> subcategory -> routing rule -> SLA | Saksham + Aditya | 1 hr |
| 3.4 | Test escalation + notification flow | Aditya | 30 min |
| 3.5 | Fix integration bugs | All | 1 hr |
| 3.6 | Seed realistic demo data | Sourabh | 30 min |
| 3.7 | Docker Compose build and test | Sourabh | 30 min |
| 3.8 | Merge `dev` -> `main` | Sourabh | 10 min |

### Timeline Summary

```
DAY 1 (approx 8 hours)
  Hours 1-2:   Phase 0 -- Project Setup (All)
  Hours 3-8:   Phase 1 -- Auth (Sourabh)
               Parallel: Models + Schemas (Saksham, Aditya)

DAY 2 (approx 8 hours)
  Hours 1-10:  Phase 2 -- All three in parallel
               Sourabh: M2 Ticket Management
               Saksham: M4 Admin + M3 Assignment
               Aditya:  M5 SLA/Notifications + M6 FAQ/Dashboard
  Hours 11-14: Phase 3 -- Integration & Testing (All)
```

---

## Appendix A: Priority Enum Values

Per the BRD: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`

> The Architecture PDF uses `URGENT` instead of `CRITICAL`. The BRD is the source of truth. Use `CRITICAL`.

## Appendix B: Status Enum Values

Per the BRD: `OPEN`, `ASSIGNED`, `IN_PROGRESS`, `WAITING_FOR_USER`, `RESOLVED`, `CLOSED`, `REOPENED`

> The Architecture PDF only lists `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`. The task tracker (M3-F2-T1) explicitly lists: "Open, Assigned, In Progress, Resolved, Closed". The BRD adds `WAITING_FOR_USER`, `REOPENED`, and `ESCALATED`. For the MVP, implement: `OPEN`, `ASSIGNED`, `IN_PROGRESS`, `WAITING_FOR_USER`, `RESOLVED`, `CLOSED`, `REOPENED`. The `ESCALATED` status is tracked via the `ticket_escalations` table, not as a ticket status.

## Appendix C: Conflict Resolution Log

| Conflict | BRD Says | Architecture PDF Says | Resolution |
|---|---|---|---|
| Number of DB tables | 17 entities | 7 tables | **17 tables** -- the task tracker assigns work that requires them |
| Priority: CRITICAL vs URGENT | LOW/MEDIUM/HIGH/CRITICAL | LOW/MEDIUM/HIGH/URGENT | **CRITICAL** (BRD is source of truth) |
| Ticket statuses | OPEN/ASSIGNED/IN_PROGRESS/WAITING_FOR_USER/RESOLVED/CLOSED/REOPENED/ESCALATED | OPEN/IN_PROGRESS/RESOLVED/CLOSED | **BRD statuses minus ESCALATED** (escalation is a separate entity) |
| Subcategories | Yes, full routing chain | Not mentioned | **Yes** -- task tracker M4-F2-T1 explicitly assigns this |
| Routing rules | Dept->Category->Subcategory->Routing Rule->Team | Category->Resolver (simple) | **Full routing chain** -- task M4-F2-T2 assigns this |
| SLA policies | Full SLA with response/resolution targets | Not mentioned | **Yes** -- task M5-F1-T1 through M5-F1-T3 assign this |
| FAQs | Required feature | Not mentioned | **Yes** -- task M6-F1-T1 through M6-F1-T3 assign this |
| File storage | OneDrive references | Local file paths | **Local file paths** for MVP, metadata supports OneDrive reference column for future |
| Dashboard | Separate User/Resolver/Admin dashboards | Unified Employee+Resolver, separate Admin | **Unified Employee+Resolver + separate Admin** (Architecture PDF decision for simplicity) |
| Role names | User/Resolver/Administrator | Employee/Resolver/Super Admin | **EMPLOYEE/RESOLVER/SUPER_ADMIN** (Architecture PDF names match the task tracker's admin references) |

---

> **Next Step:** After team review of this plan, begin implementation starting with Phase 0.
