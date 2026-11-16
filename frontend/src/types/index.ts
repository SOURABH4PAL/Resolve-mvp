export type UserRole = 'EMPLOYEE' | 'SUPER_ADMIN';

export interface User {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  role: UserRole;
  department_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  department?: Department | null;
  responsibilities?: string[];
}

export interface Department {
  id: string;
  name: string;
  code?: string | null;
  department_email?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  department_id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  responsible_employee_id?: string | null;
  responsible_employee?: User | null;
  created_at: string;
  updated_at: string;
  department?: Department | null;
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type TicketStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_USER'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REOPENED';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  uploaded_by: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type?: string | null;
  created_at: string;
  uploader?: User | null;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  user_id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
  user?: User | null;
}

export interface TicketJourneyEvent {
  id: string;
  ticket_id: string;
  actor_id?: string | null;
  event_type: string;
  description: string;
  old_value?: string | null;
  new_value?: string | null;
  created_at: string;
  actor?: User | null;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  created_by: string;
  category_id?: string | null;
  subcategory_id?: string | null;
  assigned_to?: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  is_blocked?: boolean;
  blocked_reason?: string | null;
  blocked_at?: string | null;
  blocked_by_id?: string | null;
  blocked_by?: User | null;
  response_due_at?: string | null;
  resolution_due_at?: string | null;
  first_responded_at?: string | null;
  resolved_at?: string | null;
  closed_at?: string | null;
  sla_status?: 'IN_SLA' | 'AT_RISK' | 'BREACHED' | 'NO_SLA' | string | null;
  created_at: string;
  updated_at: string;
  creator?: User | null;
  assignee?: User | null;
  category?: Category | null;
  subcategory?: Subcategory | null;
  comments?: TicketComment[];
  attachments?: TicketAttachment[];
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  role: UserRole;
  user_id: string;
  name: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  ticket_id?: string;
  ticket_number?: string;
}

export interface CategoryResponsibility {
  id: string;
  department_id: string;
  category_id: string;
  category_name: string;
  department_name: string;
  responsible_employee_id: string;
  responsible_employee_name: string;
  responsible_employee_email: string;
  backup_employee_id?: string | null;
  backup_employee_name?: string | null;
  updated_at: string;
}

export interface EmployeeWorkloadItem {
  employee_id: string;
  user_id: string;
  name: string;
  email: string;
  department: string;
  responsibilities: string[];
  assignedTicketsCount: number;
  resolvedTicketsCount: number;
}

export interface EscalationItem {
  id: string;
  ticket_number: string;
  title: string;
  priority: TicketPriority;
  department: string;
  responsible_employee_name: string;
  hours_elapsed: number;
  sla_limit_hours: number;
  status: TicketStatus;
}

export interface SlaSummary {
  total_eligible: number;
  within_sla: number;
  at_risk: number;
  breached: number;
  compliance_percentage: number;
}

export interface DepartmentSlaPerformance {
  department_id: string;
  department_name: string;
  total_eligible: number;
  within_sla: number;
  breached: number;
  compliance_percentage: number;
}

export interface DepartmentWorkload {
  department_id: string;
  department_name: string;
  total_tickets: number;
  open_tickets: number;
  resolved_tickets: number;
}

export interface DashboardReport {
  summary: {
    total_tickets: number;
    open_tickets: number;
    in_progress_tickets: number;
    resolved_tickets: number;
    closed_tickets: number;
    unassigned_tickets: number;
    blocked_tickets: number;
    avg_resolution_hours: number;
  };
  status_distribution: Record<string, number>;
  priority_distribution: Record<string, number>;
  department_workload: DepartmentWorkload[];
  sla_summary?: SlaSummary;
  department_sla?: DepartmentSlaPerformance[];
}

export interface SlaRule {
  priority: TicketPriority;
  firstResponseHours: number;
  resolutionHours: number;
  escalateTo: string;
  description: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  department_name: string;
  category_name: string;
  views: number;
  helpful_count: number;
}
