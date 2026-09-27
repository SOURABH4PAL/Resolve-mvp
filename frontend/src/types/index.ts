export type UserRole = 'EMPLOYEE' | 'RESOLVER' | 'SUPER_ADMIN';

export interface User {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  role: UserRole;
  department_id: string;
  department_name: string;
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  department_email: string;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  department_id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  uploaded_by: string;
  uploader_name: string;
  file_name: string;
  file_path: string;
  file_size: string;
  created_at: string;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  user_id: string;
  user_name: string;
  user_role: UserRole;
  comment: string;
  is_internal?: boolean;
  created_at: string;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  created_by: string;
  creator_name: string;
  creator_email: string;
  category_id: string;
  category_name: string;
  department_id: string;
  department_name: string;
  assigned_to?: string | null;
  assignee_name?: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  comments?: TicketComment[];
  attachments?: TicketAttachment[];
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
