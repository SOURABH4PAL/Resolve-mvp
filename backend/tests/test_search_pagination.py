"""Tests for Requirements 4, 5, and 6: Search, Pagination, Sorting, and Filtering."""

import pytest
from tests.conftest import (
    make_user,
    make_admin,
    make_department,
    make_category,
    make_subcategory,
    auth_headers,
)
from app.models.ticket import TicketPriority, TicketStatus


class TestSearchPaginationSortingFiltering:
    @pytest.fixture(autouse=True)
    def setup_data(self, client, db):
        """Create sample dataset for search, pagination, sorting, and filtering tests."""
        self.dept_it = make_department(db, name="IT Support")
        self.dept_hr = make_department(db, name="Human Resources")

        self.cat_it = make_category(db, self.dept_it.id, name="IT Hardware")
        self.cat_hr = make_category(db, self.dept_hr.id, name="HR Inquiries")

        self.subcat_laptop = make_subcategory(db, self.cat_it.id, name="Laptop Problems")
        self.subcat_vpn = make_subcategory(db, self.cat_it.id, name="VPN Connectivity")
        self.subcat_payroll = make_subcategory(db, self.cat_hr.id, name="Payroll Issues")

        self.admin = make_admin(db, employee_id="ADM_SRCH_01", name="Sarah Admin")
        self.emp1 = make_user(db, employee_id="EMP_SRCH_01", name="John Developer")
        self.emp2 = make_user(db, employee_id="EMP_SRCH_02", name="Jane Support")

        self.admin_headers = auth_headers(self.admin)
        self.emp1_headers = auth_headers(self.emp1)
        self.emp2_headers = auth_headers(self.emp2)

        # Create multiple tickets with varied attributes
        # Ticket 1: emp1 created, cat_it, subcat_laptop, HIGH
        resp1 = client.post(
            "/api/tickets",
            json={
                "title": "MacBook Keyboard Malfunction",
                "description": "Spacebar is sticking on company laptop",
                "category_id": self.cat_it.id,
                "subcategory_id": self.subcat_laptop.id,
                "priority": "HIGH",
            },
            headers=self.emp1_headers,
        )
        assert resp1.status_code == 201
        self.t1 = resp1.json()

        # Ticket 2: emp1 created, cat_it, subcat_vpn, CRITICAL
        resp2 = client.post(
            "/api/tickets",
            json={
                "title": "VPN Gateway Timeout in London",
                "description": "Cannot connect to production VPN server",
                "category_id": self.cat_it.id,
                "subcategory_id": self.subcat_vpn.id,
                "priority": "CRITICAL",
            },
            headers=self.emp1_headers,
        )
        assert resp2.status_code == 201
        self.t2 = resp2.json()

        # Ticket 3: emp2 created, cat_hr, subcat_payroll, LOW
        resp3 = client.post(
            "/api/tickets",
            json={
                "title": "Tax deduction discrepancy for September",
                "description": "Paystub shows unexpected withholdings",
                "category_id": self.cat_hr.id,
                "subcategory_id": self.subcat_payroll.id,
                "priority": "LOW",
            },
            headers=self.emp2_headers,
        )
        assert resp3.status_code == 201
        self.t3 = resp3.json()

        # Ticket 4: emp1 created, cat_it, subcat_laptop, MEDIUM
        resp4 = client.post(
            "/api/tickets",
            json={
                "title": "Monitor Display Flickering",
                "description": "External HDMI display goes black intermittently",
                "category_id": self.cat_it.id,
                "subcategory_id": self.subcat_laptop.id,
                "priority": "MEDIUM",
            },
            headers=self.emp1_headers,
        )
        assert resp4.status_code == 201
        self.t4 = resp4.json()

        # Assign t2 to emp2 so t2 status becomes ASSIGNED
        assign_resp = client.put(
            f"/api/tickets/{self.t2['id']}/assign",
            json={"assignee_id": self.emp2.id},
            headers=self.admin_headers,
        )
        assert assign_resp.status_code == 200

    # -------------------------------------------------------------------------
    # A. Search Tests
    # -------------------------------------------------------------------------
    def test_search_tickets_by_title_match(self, client):
        res = client.get("/api/tickets?search=MacBook", headers=self.admin_headers)
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 1
        assert "MacBook" in data[0]["title"]

    def test_search_tickets_by_description_match(self, client):
        res = client.get("/api/tickets?search=Spacebar", headers=self.admin_headers)
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 1
        assert data[0]["id"] == self.t1["id"]

    def test_search_tickets_by_ticket_number(self, client):
        num = self.t2["ticket_number"]
        res = client.get(f"/api/tickets?search={num}", headers=self.admin_headers)
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 1
        assert data[0]["ticket_number"] == num

    def test_search_tickets_no_match(self, client):
        res = client.get("/api/tickets?search=NonExistentKeywordXYZ", headers=self.admin_headers)
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 0

    def test_search_employees_by_name_and_email(self, client):
        # By name
        res = client.get("/api/users?search=Jane", headers=self.admin_headers)
        assert res.status_code == 200
        data = res.json()
        assert len(data) >= 1
        assert any("Jane" in u["name"] for u in data)

        # By email
        res2 = client.get(f"/api/users?search={self.emp1.email}", headers=self.admin_headers)
        assert res2.status_code == 200
        assert len(res2.json()) == 1

        # By employee ID
        res_id = client.get(f"/api/users?search={self.emp1.employee_id}", headers=self.admin_headers)
        assert res_id.status_code == 200
        assert len(res_id.json()) == 1

        # No match
        res3 = client.get("/api/users?search=NoSuchEmployeeXYZ", headers=self.admin_headers)
        assert res3.status_code == 200
        assert len(res3.json()) == 0

    def test_search_categories_by_name(self, client):
        res = client.get("/api/categories?search=Hardware", headers=self.admin_headers)
        assert res.status_code == 200
        data = res.json()
        assert any("Hardware" in c["name"] for c in data)

        res_none = client.get("/api/categories?search=UnknownCategory123", headers=self.admin_headers)
        assert res_none.status_code == 200
        assert len(res_none.json()) == 0

    def test_search_subcategories_by_name_and_parent_category(self, client):
        # Match subcategory name
        res = client.get("/api/subcategories?search=VPN", headers=self.admin_headers)
        assert res.status_code == 200
        data = res.json()
        assert len(data) >= 1
        assert any("VPN" in s["name"] for s in data)

        # Match parent category name ("IT Hardware")
        res2 = client.get("/api/subcategories?search=IT Hardware", headers=self.admin_headers)
        assert res2.status_code == 200
        assert len(res2.json()) >= 2

    # -------------------------------------------------------------------------
    # B. Pagination Tests
    # -------------------------------------------------------------------------
    def test_pagination_tickets_pages(self, client):
        # Total tickets created in setup = 4
        # Page 1, size 2
        res1 = client.get("/api/tickets?page=1&page_size=2", headers=self.admin_headers)
        assert res1.status_code == 200
        items1 = res1.json()
        assert len(items1) == 2
        assert res1.headers["X-Total-Count"] == "4"
        assert res1.headers["X-Page"] == "1"
        assert res1.headers["X-Page-Size"] == "2"
        assert res1.headers["X-Total-Pages"] == "2"

        # Page 2, size 2
        res2 = client.get("/api/tickets?page=2&page_size=2", headers=self.admin_headers)
        assert res2.status_code == 200
        items2 = res2.json()
        assert len(items2) == 2
        assert res2.headers["X-Page"] == "2"

        # Distinct tickets across pages
        ids_p1 = {t["id"] for t in items1}
        ids_p2 = {t["id"] for t in items2}
        assert ids_p1.isdisjoint(ids_p2)

    def test_pagination_out_of_range(self, client):
        # Page 99 when there are only 4 records
        res = client.get("/api/tickets?page=99&page_size=10", headers=self.admin_headers)
        assert res.status_code == 200
        assert len(res.json()) == 0
        assert res.headers["X-Total-Count"] == "4"
        assert res.headers["X-Total-Pages"] == "1"

    def test_pagination_invalid_page_parameters(self, client):
        # page < 1 should return 422
        res0 = client.get("/api/tickets?page=0", headers=self.admin_headers)
        assert res0.status_code == 422

        res_neg = client.get("/api/tickets?page=-1", headers=self.admin_headers)
        assert res_neg.status_code == 422

        # page_size > 100 should return 422
        res_large = client.get("/api/tickets?page_size=101", headers=self.admin_headers)
        assert res_large.status_code == 422

    def test_pagination_envelope_support(self, client):
        res = client.get("/api/tickets?page=1&page_size=2&envelope=true", headers=self.admin_headers)
        assert res.status_code == 200
        body = res.json()
        assert "items" in body
        assert "total" in body
        assert "page" in body
        assert "page_size" in body
        assert "total_pages" in body
        assert body["total"] == 4
        assert body["page"] == 1
        assert body["page_size"] == 2
        assert body["total_pages"] == 2
        assert len(body["items"]) == 2

    # -------------------------------------------------------------------------
    # C. Sorting Tests
    # -------------------------------------------------------------------------
    def test_sort_tickets_by_title_asc_and_desc(self, client):
        # Ascending
        res_asc = client.get("/api/tickets?sort_by=title&sort_order=asc", headers=self.admin_headers)
        assert res_asc.status_code == 200
        titles_asc = [t["title"] for t in res_asc.json()]
        assert titles_asc == sorted(titles_asc)

        # Descending
        res_desc = client.get("/api/tickets?sort_by=title&sort_order=desc", headers=self.admin_headers)
        assert res_desc.status_code == 200
        titles_desc = [t["title"] for t in res_desc.json()]
        assert titles_desc == sorted(titles_desc, reverse=True)

    def test_sort_tickets_by_priority(self, client):
        res = client.get("/api/tickets?sort_by=priority&sort_order=asc", headers=self.admin_headers)
        assert res.status_code == 200
        assert len(res.json()) == 4

    def test_sort_tickets_invalid_sort_field_rejected(self, client):
        res = client.get("/api/tickets?sort_by=malicious_sql_inject", headers=self.admin_headers)
        assert res.status_code == 400
        assert "Invalid sort field" in res.json()["detail"]

    def test_sort_tickets_invalid_sort_order_rejected(self, client):
        res = client.get("/api/tickets?sort_by=created_at&sort_order=random", headers=self.admin_headers)
        assert res.status_code == 400
        assert "Invalid sort order" in res.json()["detail"]

    # -------------------------------------------------------------------------
    # D. Filtering Tests
    # -------------------------------------------------------------------------
    def test_filter_tickets_by_priority(self, client):
        res = client.get("/api/tickets?priority=CRITICAL", headers=self.admin_headers)
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 1
        assert data[0]["priority"] == "CRITICAL"

    def test_filter_tickets_by_status(self, client):
        res = client.get("/api/tickets?status=ASSIGNED", headers=self.admin_headers)
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 1
        assert data[0]["status"] == "ASSIGNED"
        assert data[0]["id"] == self.t2["id"]

    def test_filter_tickets_by_department(self, client):
        res_hr = client.get(f"/api/tickets?department_id={self.dept_hr.id}", headers=self.admin_headers)
        assert res_hr.status_code == 200
        data = res_hr.json()
        assert len(data) == 1
        assert data[0]["id"] == self.t3["id"]

    def test_filter_tickets_by_category_and_subcategory(self, client):
        res = client.get(
            f"/api/tickets?category_id={self.cat_it.id}&subcategory_id={self.subcat_laptop.id}",
            headers=self.admin_headers,
        )
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 2
        for t in data:
            assert t["category_id"] == self.cat_it.id
            assert t["subcategory_id"] == self.subcat_laptop.id

    def test_filter_tickets_by_assigned_to(self, client):
        res = client.get(f"/api/tickets?assigned_to={self.emp2.id}", headers=self.admin_headers)
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 1
        assert data[0]["id"] == self.t2["id"]

    def test_filter_tickets_by_created_by(self, client):
        res = client.get(f"/api/tickets?created_by={self.emp1.id}", headers=self.admin_headers)
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 3
        for t in data:
            assert t["created_by"] == self.emp1.id

    # -------------------------------------------------------------------------
    # E. Combined Search, Filter, Sort, and Pagination
    # -------------------------------------------------------------------------
    def test_combined_search_filter_sort_pagination(self, client):
        # Search "laptop" + category cat_it + sort by title asc + page 1 size 1
        res = client.get(
            f"/api/tickets?search=laptop&category_id={self.cat_it.id}&sort_by=title&sort_order=asc&page=1&page_size=1",
            headers=self.admin_headers,
        )
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 1
        assert res.headers["X-Total-Count"] == "1"
        assert res.headers["X-Page"] == "1"
        assert res.headers["X-Total-Pages"] == "1"

    # -------------------------------------------------------------------------
    # F. Permissions on Search / Pagination
    # -------------------------------------------------------------------------
    def test_employee_search_and_pagination_scoped_to_accessible_tickets(self, client):
        # emp2 created t3 and was assigned t2 -> should see exactly 2 tickets total
        res = client.get("/api/tickets", headers=self.emp2_headers)
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 2
        ticket_ids = {t["id"] for t in data}
        assert ticket_ids == {self.t2["id"], self.t3["id"]}
        assert self.t1["id"] not in ticket_ids

        # emp2 searches for "MacBook" (created by emp1, not assigned to emp2)
        res_hidden = client.get("/api/tickets?search=MacBook", headers=self.emp2_headers)
        assert res_hidden.status_code == 200
        assert len(res_hidden.json()) == 0
