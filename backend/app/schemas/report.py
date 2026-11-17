"""
Schemas for Audit & Review Dashboard charts and aggregations (Requirement 9 & Phase 7).
"""

from typing import Dict, List, Optional
from pydantic import BaseModel


class DepartmentWorkload(BaseModel):
    department_id: str
    department_name: str
    total_tickets: int
    open_tickets: int
    resolved_tickets: int


class DailyTrendPoint(BaseModel):
    date: str
    created_count: int
    resolved_count: int


class DashboardSummary(BaseModel):
    total_tickets: int
    open_tickets: int
    in_progress_tickets: int
    resolved_tickets: int
    closed_tickets: int
    unassigned_tickets: int
    blocked_tickets: int = 0
    avg_resolution_hours: float


class SlaSummary(BaseModel):
    total_eligible: int
    within_sla: int
    at_risk: int
    breached: int
    compliance_percentage: float


class DepartmentSlaPerformance(BaseModel):
    department_id: str
    department_name: str
    total_eligible: int
    within_sla: int
    breached: int
    compliance_percentage: float


class DashboardReport(BaseModel):
    summary: DashboardSummary
    status_distribution: Dict[str, int]
    priority_distribution: Dict[str, int]
    department_workload: List[DepartmentWorkload]
    recent_trend: List[DailyTrendPoint]
    sla_summary: Optional[SlaSummary] = None
    department_sla: Optional[List[DepartmentSlaPerformance]] = None
