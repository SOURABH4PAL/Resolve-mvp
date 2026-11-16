"""
Reports & Analytics API router for dashboard charts (Requirement 9 & Phase 7).
Provides live database aggregations for ticket statuses, priorities, department workloads, SLA performance, and trends.
"""

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.ticket import Ticket, TicketStatus, TicketPriority
from app.models.department import Department
from app.models.category import Category
from app.models.user import User
from app.schemas.report import (
    DashboardReport,
    DashboardSummary,
    DepartmentWorkload,
    DailyTrendPoint,
    SlaSummary,
    DepartmentSlaPerformance,
)
from app.dependencies import get_current_user

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/dashboard", response_model=DashboardReport)
def get_dashboard_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Aggregate ticket counts, priority/status breakdowns, department workloads, SLA metrics, and trends."""
    # 1. Status distribution
    status_counts = {s.value: 0 for s in TicketStatus}
    db_status_rows = db.query(Ticket.status, func.count(Ticket.id)).group_by(Ticket.status).all()
    for st, count in db_status_rows:
        key = st.value if hasattr(st, "value") else str(st)
        status_counts[key] = count

    # 2. Priority distribution
    priority_counts = {p.value: 0 for p in TicketPriority}
    db_prio_rows = db.query(Ticket.priority, func.count(Ticket.id)).group_by(Ticket.priority).all()
    for pr, count in db_prio_rows:
        key = pr.value if hasattr(pr, "value") else str(pr)
        priority_counts[key] = count

    # 3. Department workload & Department SLA
    dept_workloads = []
    dept_sla_list = []
    departments = db.query(Department).filter(Department.is_active == True).order_by(Department.name.asc()).all()

    for dept in departments:
        tickets_in_dept = (
            db.query(Ticket)
            .join(Category, Ticket.category_id == Category.id)
            .filter(Category.department_id == dept.id)
            .all()
        )
        total = len(tickets_in_dept)
        open_cnt = sum(1 for t in tickets_in_dept if t.status not in (TicketStatus.RESOLVED, TicketStatus.CLOSED))
        res_cnt = sum(1 for t in tickets_in_dept if t.status in (TicketStatus.RESOLVED, TicketStatus.CLOSED))
        dept_workloads.append(
            DepartmentWorkload(
                department_id=dept.id,
                department_name=dept.name,
                total_tickets=total,
                open_tickets=open_cnt,
                resolved_tickets=res_cnt,
            )
        )

        # Department SLA calculation
        eligible_dept_tickets = [t for t in tickets_in_dept if t.resolution_due_at is not None]
        dept_eligible = len(eligible_dept_tickets)
        dept_breached = sum(1 for t in eligible_dept_tickets if t.sla_status == "BREACHED")
        dept_within = sum(1 for t in eligible_dept_tickets if t.sla_status in ("IN_SLA", "AT_RISK"))
        dept_compliance = (
            round((dept_within / dept_eligible) * 100.0, 1) if dept_eligible > 0 else 100.0
        )

        dept_sla_list.append(
            DepartmentSlaPerformance(
                department_id=dept.id,
                department_name=dept.name,
                total_eligible=dept_eligible,
                within_sla=dept_within,
                breached=dept_breached,
                compliance_percentage=dept_compliance,
            )
        )

    # 4. Summary metrics
    total_tickets = sum(status_counts.values())
    open_tickets = status_counts.get(TicketStatus.OPEN.value, 0)
    in_progress = (
        status_counts.get(TicketStatus.IN_PROGRESS.value, 0)
        + status_counts.get(TicketStatus.ASSIGNED.value, 0)
        + status_counts.get(TicketStatus.WAITING_FOR_USER.value, 0)
    )
    resolved_tickets = status_counts.get(TicketStatus.RESOLVED.value, 0)
    closed_tickets = status_counts.get(TicketStatus.CLOSED.value, 0)
    unassigned = db.query(Ticket).filter(Ticket.assigned_to == None).count()
    blocked_count = db.query(Ticket).filter(Ticket.is_blocked == True).count()

    resolved_objs = db.query(Ticket).filter(Ticket.resolved_at != None, Ticket.created_at != None).all()
    if resolved_objs:
        durations = [(r.resolved_at - r.created_at).total_seconds() / 3600.0 for r in resolved_objs]
        avg_res_hours = round(sum(durations) / len(durations), 2)
    else:
        avg_res_hours = 0.0

    summary = DashboardSummary(
        total_tickets=total_tickets,
        open_tickets=open_tickets,
        in_progress_tickets=in_progress,
        resolved_tickets=resolved_tickets,
        closed_tickets=closed_tickets,
        unassigned_tickets=unassigned,
        blocked_tickets=blocked_count,
        avg_resolution_hours=avg_res_hours,
    )

    # 5. Global SLA calculation
    all_tickets = db.query(Ticket).all()
    eligible_all = [t for t in all_tickets if t.resolution_due_at is not None]
    total_eligible = len(eligible_all)
    within_sla = sum(1 for t in eligible_all if t.sla_status in ("IN_SLA", "AT_RISK"))
    at_risk = sum(1 for t in eligible_all if t.sla_status == "AT_RISK")
    breached = sum(1 for t in eligible_all if t.sla_status == "BREACHED")
    compliance_pct = round((within_sla / total_eligible) * 100.0, 1) if total_eligible > 0 else 100.0

    global_sla = SlaSummary(
        total_eligible=total_eligible,
        within_sla=within_sla,
        at_risk=at_risk,
        breached=breached,
        compliance_percentage=compliance_pct,
    )

    # 6. Recent trend (last 7 days)
    today = datetime.utcnow().date()
    trend_points = []
    for day_offset in range(6, -1, -1):
        day = today - timedelta(days=day_offset)
        start_dt = datetime(day.year, day.month, day.day, 0, 0, 0)
        end_dt = datetime(day.year, day.month, day.day, 23, 59, 59)

        c_count = (
            db.query(Ticket)
            .filter(Ticket.created_at >= start_dt, Ticket.created_at <= end_dt)
            .count()
        )
        r_count = (
            db.query(Ticket)
            .filter(Ticket.resolved_at >= start_dt, Ticket.resolved_at <= end_dt)
            .count()
        )
        trend_points.append(
            DailyTrendPoint(
                date=day.isoformat(),
                created_count=c_count,
                resolved_count=r_count,
            )
        )

    return DashboardReport(
        summary=summary,
        status_distribution=status_counts,
        priority_distribution=priority_counts,
        department_workload=dept_workloads,
        recent_trend=trend_points,
        sla_summary=global_sla,
        department_sla=dept_sla_list,
    )
