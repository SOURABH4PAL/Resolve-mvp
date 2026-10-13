"""
Schemas for Audit & Review Dashboard charts and aggregations (Requirement 9).
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
    avg_resolution_hours: float


class DashboardReport(BaseModel):
    summary: DashboardSummary
    status_distribution: Dict[str, int]
    priority_distribution: Dict[str, int]
    department_workload: List[DepartmentWorkload]
    recent_trend: List[DailyTrendPoint]
