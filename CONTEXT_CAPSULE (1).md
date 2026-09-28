# ResolveHub — Antigravity Context Capsule

## PURPOSE

This file transfers the current ResolveHub project context to a new Antigravity account/workspace.

**Read this file completely before making code changes.**

Do NOT restart, rewrite, or redesign the project from scratch. Continue from the existing repository.

---

# 1. PROJECT

**Name:** ResolveHub

ResolveHub is an internal, multi-department ticket management system for a mid-sized company.

The MVP allows employees to:
- Log in securely
- Create support tickets
- Select department/category/subcategory where applicable
- Track tickets
- Add comments
- Upload attachments
- Follow ticket status
- Receive notifications

Super Admins can:
- View/manage tickets
- Assign/reassign tickets
- Manage employees
- Manage departments/categories/subcategories
- Configure responsibility/routing
- Manage SLA-related settings
- Manage FAQs
- View administrative dashboards

## CRITICAL PRODUCT DECISION

There are ONLY TWO roles:

- `EMPLOYEE`
- `SUPER_ADMIN`

There is NO separate `RESOLVER` role.

A normal Employee can also be responsible for handling assigned tickets.

**Role != responsibility.**

Never introduce a Resolver role or Resolver dashboard.

---

# 2. TEAM OWNERSHIP

### Sourabh
- M1 — Authentication & User Access
- M2 — Core Ticket Management
- Integration lead

### Saksham
- M3 — Assignment & Resolution
- M4 — Admin & Master Data

### Aditya
- M5 — SLA, Escalation & Notifications
- M6 — FAQ, History & Dashboard

Do not move ownership without explicit instruction.

---

# 3. CURRENT STATUS

Sourabh has already implemented the core M1 + M2 backend.

Implemented:
- JWT authentication
- Password hashing
- RBAC
- User management
- Ticket creation
- Ticket listing
- Ticket detail
- Comments
- Attachments
- Ticket status changes
- Ticket resolution
- Ticket closure
- Database models
- Database migrations
- Seed data
- Backend tests

Core flow tested:

`login -> create ticket -> comment -> status change -> resolve -> close`

Aditya's backend foundation work was also integrated.

Current Sourabh development branch:

`SOURABH/m1-m2-core` (actual branch name: `sourabh/m1-m2-core`)

GitHub repository:

`SOURABH4PAL/Resolve-mvp`

---

# 4. GIT RULES

Repository strategy:

- `main` = stable
- `dev` = integration/development
- Feature branches = individual work

Do NOT push directly to `main` or `dev`.

Normal flow:

`feature branch -> PR -> dev -> main`

Sourabh is integration lead.

Before changes:
1. Check branch.
2. Check git status.
3. Inspect existing implementation.
4. Make the smallest required change.
5. Run tests.
6. Review git diff.
7. Commit clearly.
8. Push only to the appropriate feature branch.

Never reset/delete another developer's work unless explicitly instructed.

---

# 5. TECH STACK

## Backend
- Python
- FastAPI
- SQLAlchemy
- PostgreSQL
- Alembic
- Pydantic
- JWT
- Password hashing
- Local file uploads for MVP

## Frontend
Current frontend foundation uses:
- React
- TypeScript
- Vite
- React Router
- Lucide icons

The BRD permits an approved modern frontend framework.

Do NOT replace React with Vanilla JS unless explicitly instructed.

## Development
- Git
- GitHub
- Docker
- Local development

---

# 6. ROLE ARCHITECTURE

OLD MODEL:

`EMPLOYEE -> RESOLVER -> SUPER_ADMIN`

CURRENT MODEL:

`EMPLOYEE -> SUPER_ADMIN`

Example:

- Employee A creates a Hardware ticket.
- Employee B is responsible for Hardware tickets.
- Employee B remains an `EMPLOYEE`.
- The ticket is assigned to Employee B.

Do not create a Resolver role to represent responsibility.

---

# 7. ROLE PERMISSIONS

## EMPLOYEE

Employees can:
- Log in
- View their profile
- Create tickets
- View their own tickets
- Comment on authorized tickets
- Upload attachments where authorized
- View ticket status
- Handle tickets assigned/responsible to them
- Resolve assigned tickets where the workflow permits

## SUPER_ADMIN

Super Admin can:
- View all tickets
- Assign/reassign tickets
- Manage employees
- Manage departments
- Manage categories
- Manage subcategories
- Configure responsibility/routing
- Manage SLA configuration
- Manage FAQs
- View administrative dashboards
- Perform administrative ticket actions

Do not create a Resolver permission set.

---

# 8. AUTHENTICATION

M1 handles authentication and user access.

Authentication uses:
- Password hashing
- JWT
- Role-based authorization

Valid roles:

```text
EMPLOYEE
SUPER_ADMIN
```

Login should provide the information required by the frontend, including:

```text
access_token
token_type
role
user_id
name
```

Expected endpoint:

```text
GET /users/me
```

It should return the authenticated user's profile and role.

If the database still contains a legacy Resolver enum/value, migrate it safely rather than breaking the database.

Do not keep Resolver as an active application role.

---

# 9. TICKETS

Ticket concepts include:
- Ticket number
- Creator
- Department/category/subcategory
- Assigned employee
- Priority
- Status
- SLA fields
- Created/updated timestamps
- Comments
- Attachments

## Priority

Current backend/project terminology:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

Do not introduce `URGENT` unless explicitly required.

## Status

Current broader project model:

```text
OPEN
ASSIGNED
IN_PROGRESS
WAITING_FOR_USER
RESOLVED
CLOSED
REOPENED
```

Do not randomly rename/simplify these values.

---

# 10. ASSIGNMENT

Old concept:

`assigned_resolver`

New concept:

`assigned employee`

Preferred business meaning:

`assigned_to_user_id`

Existing code may use `assigned_to`.

Inspect the actual model and migrations before changing database columns.

Do not perform a blind global rename.

The important rule is:

> A ticket is assigned to an Employee who is responsible for handling it.

Super Admin can manually assign/reassign tickets.

Responsibility/routing can automatically determine the appropriate employee.

---

# 11. RESPONSIBILITY / ROUTING

This belongs mainly to M3/M4.

The goal is simple:

Department/category/subcategory can determine which Employee is responsible for a ticket.

Possible approaches:
- Responsibility directly on category/subcategory
- A small routing-rule model

Use the smallest maintainable approach compatible with the existing project.

Do NOT build an enterprise-grade rules engine.

---

# 12. DATABASE ENTITIES

The broader MVP plan includes:

- users
- departments
- support_teams
- support_team_members
- categories
- subcategories
- routing_rules
- sla_policies
- tickets
- ticket_comments
- ticket_attachments
- ticket_status_history
- ticket_assignments
- ticket_escalations
- notifications
- faqs
- feedback

Do not redesign every table for every task.

Follow module ownership and existing implementation.

---

# 13. BACKEND

Current backend routers include functionality related to:
- Authentication
- Users
- Tickets
- Comments
- Attachments
- Departments
- Categories
- Subcategories

Notifications are not part of the completed M1/M2 implementation.

M5/M6 may add notification functionality.

Do not implement M5/M6 while doing an M1/M2 task unless required for integration.

---

# 14. TICKET AUTHORIZATION CHANGE

Some existing M1/M2 code previously referenced `RESOLVER` for ticket resolution.

This must be updated to the new business model.

Correct concept:

> An assigned Employee can handle/resolve their assigned ticket, while Super Admin can perform administrative ticket actions.

Do not simply replace the word `RESOLVER` everywhere.

Understand the permission being enforced first.

---

# 15. FRONTEND STATUS

Saksham has a frontend foundation branch:

`feature/frontend-foundation`

It contains:
- React 18
- TypeScript
- Vite
- Reusable components
- Multiple pages
- Mock state/context
- Dashboard UI
- Ticket UI
- Login UI

The frontend currently uses mock authentication/state in places.

It must eventually connect to the real backend.

The frontend previously contained:

```text
EMPLOYEE
RESOLVER
SUPER_ADMIN
```

It must become:

```text
EMPLOYEE
SUPER_ADMIN
```

No Resolver dashboard.

---

# 16. FRONTEND BUSINESS MODEL

## Employee dashboard

Should show:
- Employee's own created tickets
- Tickets assigned/responsible to that Employee
- Relevant status
- Actions available to that Employee

There is no separate Resolver dashboard.

## Super Admin dashboard

Can show:
- Total tickets
- Tickets by status
- Department information
- Employee workload
- SLA information
- Unassigned tickets
- Activity

Exact implementation belongs to the relevant module owner.

---

# 17. FRONTEND/BACKEND INTEGRATION

The React frontend currently contains mock data.

Eventually:
1. Connect Vite frontend to FastAPI.
2. Add an API client.
3. Login through the real auth endpoint.
4. Store/use JWT.
5. Send:

`Authorization: Bearer <token>`

6. Use `/users/me`.
7. Replace mock tickets with real ticket APIs.
8. Connect departments/categories/subcategories.
9. Connect comments/attachments/status/resolve/close.
10. Align TypeScript types exactly with backend enums.

Do not integrate fake Resolver functionality.

---

# 18. IMPORTANT FRONTEND ENUM MISMATCHES

Old frontend priority included:

`URGENT`

Backend uses:

`CRITICAL`

Backend/project status model is also broader than the old frontend status type.

Frontend and backend must eventually use the same API contract.

Do not change backend values just to make frontend integration easier unless explicitly approved.

---

# 19. BACKEND FOUNDATION ALREADY INTEGRATED

Aditya's backend foundation was integrated into Sourabh's branch.

It included:
- Environment-driven CORS
- Health endpoints
- Centralized exception handling
- Settings improvements
- Related tests

Do not revert it.

CORS should remain environment-driven.

Do not restore permanent:

`allow_origins=["*"]`

for production.

---

# 20. DOCUMENTATION PRIORITY

Project documentation includes:
- BRD
- PROJECT_PLAN.md
- Architecture PDF
- Existing code

Where the older architecture conflicts with the current execution plan, follow the current `PROJECT_PLAN.md`.

Before a major architectural change:
1. Inspect code.
2. Check PROJECT_PLAN.md.
3. Check BRD.
4. Ask Sourabh if still unclear.

---

# 21. CURRENT REQUIRED ROLE CHANGE

The current major change is removal of Resolver as a ROLE.

Required result:

```text
User roles:
EMPLOYEE
SUPER_ADMIN
```

Business model:

```text
Employee
  - creates own tickets
  - may be responsible for assigned tickets

Super Admin
  - manages users
  - manages tickets
  - assigns/reassigns tickets
  - configures responsibility/routing
```

Do not remove assignment/responsibility functionality.

Only remove the separate Resolver role.

---

# 22. DO NOT DO THESE THINGS

Do NOT:
- Recreate the project from scratch.
- Delete working M1/M2 functionality.
- Introduce Resolver again.
- Create a Resolver dashboard.
- Rewrite the entire frontend.
- Replace React.
- Implement all six modules at once.
- Build an overcomplicated routing engine.
- Rename database fields blindly.
- Change API contracts without checking dependencies.
- Push directly to main/dev.
- Delete another developer's work.
- Reset the repository to an old commit.
- Run destructive database commands on shared data.
- Assume mock frontend functionality is connected to the backend.
- Assume backend tests prove frontend integration works.

---

# 23. DEVELOPMENT STYLE

Act as a careful team member.

Before coding:
- Inspect.
- Understand.
- Identify affected module.
- Identify dependencies.
- Plan.

While coding:
- Make minimal changes.
- Preserve working functionality.
- Follow existing conventions.
- Respect module ownership.

After coding:
- Run tests.
- Run the application if possible.
- Check migrations.
- Check API behavior.
- Check git diff.
- Report exactly what changed.

If a change affects another developer's module:
- Identify the dependency.
- Do not implement their entire module.
- Make only the minimum contract change.
- Explain what remains for that developer.

---

# 24. CURRENT NEXT WORK

## Step 1 — Two-role cleanup

Sourabh / M1-M2:
- Remove active Resolver role from authentication/RBAC.
- Update JWT role handling.
- Update user role handling.
- Update seed/test data.
- Update ticket authorization where it specifically depends on Resolver.
- Keep ticket creation/comments/attachments/status/resolution/closure working.

## Step 2 — M3/M4

Saksham:
- Assignment/responsibility
- Assignment/reassignment
- Routing configuration
- User management
- Department management
- Category/subcategory management

## Step 3 — M5/M6

Aditya:
- SLA
- Escalations
- Notifications
- FAQ
- History
- Dashboards

## Step 4 — Frontend integration

Connect React frontend to the real backend once API contracts are stable.

---

# 25. TESTING

After authentication changes verify:

```text
Employee login
Super Admin login
Invalid login
JWT generation
JWT authentication
/users/me
Role authorization
```

After ticket changes verify:

```text
Employee creates ticket
Employee views own ticket
Employee comments
Employee uploads attachment
Assigned Employee can handle assigned ticket
Unauthorized Employee cannot perform restricted actions
Super Admin can manage tickets
Ticket status flow works
Resolve works
Close works
```

Do not delete tests just to make them pass.

Update tests to match the two-role model.

---

# 26. SIMPLE PROJECT MENTAL MODEL

## M1 = THE USER

M1 answers:

> Who is using ResolveHub and what are they allowed to do?

Examples:
- Login
- Password
- JWT
- Role
- Permissions
- Profile

## M2 = THE PROBLEM

M2 answers:

> What problem did the employee report and what is its current state?

Examples:
- Create ticket
- Category
- Priority
- Comments
- Attachment
- Status
- Resolve
- Close

Simple phrase:

**M1 manages the user. M2 manages the user's problem.**

---

# 27. TECHNICAL TERMS

When explaining to Sourabh, keep explanations simple.

### API
A way for frontend and backend to communicate.

### JWT
A login token that proves who the user is after login.

### RBAC
Role-Based Access Control — deciding what users can do based on their role.

### Database migration
A controlled change to database structure.

### Alembic
The migration tool used by this project.

### Endpoint
A specific backend URL/function that performs an operation.

### Frontend
What the user sees and interacts with.

### Backend
Server-side logic and APIs.

### Integration
Connecting independently developed parts so they work together.

### QA
Testing the system to find problems before release.

---

# 28. ANTIGRAVITY INSTRUCTIONS

When given a new task, first determine:

1. Which module is this?
2. Which developer owns it?
3. Does it change an API contract?
4. Does it require a migration?
5. Does it affect another developer?
6. What existing code already implements part of it?

For major changes, give a short plan before coding.

Do not assume.

If the task says "remove Resolver", understand:

**Remove Resolver as a ROLE, not as the concept of an Employee being responsible for tickets.**

---

# 29. FIRST ACTION AFTER READING THIS FILE

Do NOT modify code immediately.

First report:

### Understanding
Short summary of ResolveHub.

### Current state
What is already implemented.

### Role model
Confirm:

`EMPLOYEE + SUPER_ADMIN`

and:

`NO RESOLVER ROLE`

### Ownership
Confirm:
- Sourabh = M1/M2
- Saksham = M3/M4
- Aditya = M5/M6

### Next task
State the smallest logical next implementation step.

Then wait for instruction.

---

# 30. SOURCE-OF-TRUTH REMINDER

This capsule transfers context at the time it was created.

For exact implementation details, inspect the repository.

If code and this capsule disagree:
1. Inspect git history.
2. Check `PROJECT_PLAN.md`.
3. Ask Sourabh if the intended direction is unclear.

Do not assume this capsule is newer than future code changes.

---

# END OF CONTEXT CAPSULE
