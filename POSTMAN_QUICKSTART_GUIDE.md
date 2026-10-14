# ResolveHub API Audit - Postman Quickstart Guide

This guide will walk you step-by-step through importing, configuring, and executing the complete backend API audit test suite using Postman.

---

## 1. Prerequisites

1. **Postman Desktop Application** (recommended) or Postman Web with Desktop Agent.
2. **ResolveHub Backend Running Locally**:
   Ensure the FastAPI backend is running on `http://127.0.0.1:8000`.
   ```bash
   # From the project root:
   python seed_data.py
   python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   Confirm it is reachable by visiting `http://127.0.0.1:8000/docs` in your browser.

---

## 2. Deliverable Files

The repository includes two ready-to-import Postman files:
- **Collection File**: `ResolveHub_Complete_API_Audit.postman_collection.json`
- **Environment File**: `ResolveHub_Local.postman_environment.json`
- **Test Execution Audit Report**: `postman_test_results.csv`

---

## 3. How to Import into Postman

### Step 1: Open Postman
Open your Postman application. Create or select a workspace (e.g., "ResolveHub MVP").

### Step 2: Import Files
1. Click the **Import** button in the top-left sidebar (or press `Ctrl + O` / `Cmd + O`).
2. Drag and drop both files into the import modal:
   - `ResolveHub_Complete_API_Audit.postman_collection.json`
   - `ResolveHub_Local.postman_environment.json`
3. Click **Import**.

### Step 3: Activate the Environment
1. In the top-right corner of Postman, find the Environment dropdown (it usually defaults to *No Environment*).
2. Click the dropdown and select **`ResolveHub_Local`**.
3. Verify the environment variables:
   - `baseUrl`: `http://127.0.0.1:8000`
   - Seed credentials for Admin, Resolver, and Employee roles.

---

## 4. Running the Complete Audit Collection

The collection is designed to run sequentially using dynamic token generation and variable chaining.

1. In the left sidebar, click **Collections** and select **`ResolveHub Complete API Audit`**.
2. Click the **Run** button at the top of the collection overview tab (or click the three dots `...` next to the collection name and choose **Run collection**).
3. In the Runner configuration window:
   - **Environment**: Ensure **`ResolveHub_Local`** is selected.
   - **Iterations**: Keep as `1`.
   - **Delay**: `50 ms` (recommended to avoid rapid socket saturation).
   - **Data file**: None required (all dynamic data is self-contained).
   - Ensure all request checkboxes in the 13 folders are checked.
4. Click **Run ResolveHub Complete API Audit**.

---

## 5. What the Collection Tests

The audit covers all 49 backend routes across 13 core modules:
- **01 Authentication & RBAC**: Token generation, role-based claims (`EMPLOYEE`, `RESOLVER`, `SUPER_ADMIN`), invalid logins, and `/api/auth/me`.
- **02 User Management**: Directory listings, user profiles, and unauthorized user access checks.
- **03 Ticket Lifecycle**: Creation, ticket lookup by ID and ticket number, filtering, state transitions, validation of missing fields, and assignment.
- **04 Ticket Comments**: Valid discussions, role checks, and rejection of empty/blank content.
- **05 Attachments**: Upload format validation, file retrieval, and missing file checks.
- **06 Departments & Categories**: Master metadata CRUD, cascading subcategories.
- **07 Support Teams & Routing Rules**: Support group management and condition routing evaluation.
- **08 SLA Policies & Escalations**: Response/resolution target policies and escalation triggers.
- **09 FAQ Knowledge Base**: Employee search & admin knowledge management.
- **10 In-App Notifications**: Employee & Resolver notification streams and mark-as-read.
- **11 System Metrics**: Analytics dashboard KPIs, SLA breach statistics, and resolution velocity.
- **12 Edge Cases & Negative Security**: SQL injection probe resistance, invalid UUID formats, malformed JSON bodies, and expired JWT simulation.

---

## 6. Interpreting the Results

- **Passed Tests**: Displayed in green. All status assertions, response schema validations, and state integrity checks passed.
- **Failed Tests**: If any fail, check:
  - Is the backend server running at `http://127.0.0.1:8000`?
  - Has `python seed_data.py` been executed to populate seed accounts?
  - Did you select `ResolveHub_Local` as the active environment?
