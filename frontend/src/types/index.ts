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
  responsibilities?: string[]; // e.g. ["Hardware", "Software"]
}

export interface Department {
  id: string;
  name: string;
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

export interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  created_by: string;
  category_id: string;
  subcategory_id?: string | null;
  assigned_to?: string | null; // ID of the Responsible Employee
  priority: TicketPriority;
  status: TicketStatus;
  resolved_at?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
  creator?: User | null;
  assignee?: User | null; // The Responsible Employee
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

/**
 * Responsibility & Routing Configuration Model
 * Super Admin configures: Department -> Category -> Responsible Employee
 */
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
  responsibilities: string[]; // Category names they are responsible for
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
