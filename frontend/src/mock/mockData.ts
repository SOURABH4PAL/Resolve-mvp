import {
  Department,
  Category,
  Subcategory,
  User,
  Ticket,
  NotificationItem,
  CategoryResponsibility,
  SlaRule,
  FaqItem,
  EscalationItem,
} from '../types';

/**
 * DEPARTMENTS
 */
export const MOCK_DEPARTMENTS: Department[] = [
  {
    id: 'dept-it',
    name: 'IT Support',
    department_email: 'it-support@resolvehub.com',
    is_active: true,
    created_at: '2026-01-10T09:00:00Z',
    updated_at: '2026-01-10T09:00:00Z',
  },
  {
    id: 'dept-hr',
    name: 'Human Resources',
    department_email: 'hr@resolvehub.com',
    is_active: true,
    created_at: '2026-01-10T09:00:00Z',
    updated_at: '2026-01-10T09:00:00Z',
  },
  {
    id: 'dept-fin',
    name: 'Finance & Payroll',
    department_email: 'finance@resolvehub.com',
    is_active: true,
    created_at: '2026-01-10T09:00:00Z',
    updated_at: '2026-01-10T09:00:00Z',
  },
  {
    id: 'dept-fac',
    name: 'Facilities & Workplace',
    department_email: 'facilities@resolvehub.com',
    is_active: true,
    created_at: '2026-01-10T09:00:00Z',
    updated_at: '2026-01-10T09:00:00Z',
  },
];

/**
 * EMPLOYEES & SUPER ADMIN
 * IMPORTANT: ROLE != RESPONSIBILITY
 * Everyone is either 'EMPLOYEE' or 'SUPER_ADMIN'.
 * Support assignments are designated through Category Responsibilities.
 */
export const MOCK_USERS: User[] = [
  {
    id: 'usr-amit',
    employee_id: 'EMP-101',
    name: 'Amit Patel',
    email: 'amit.patel@resolvehub.com',
    role: 'EMPLOYEE',
    department_id: 'dept-it',
    is_active: true,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
    department: MOCK_DEPARTMENTS[0],
    responsibilities: ['Hardware Issues', 'Software & Licenses'],
  },
  {
    id: 'usr-priya',
    employee_id: 'EMP-102',
    name: 'Priya Sharma',
    email: 'priya.sharma@resolvehub.com',
    role: 'EMPLOYEE',
    department_id: 'dept-it',
    is_active: true,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
    department: MOCK_DEPARTMENTS[0],
    responsibilities: ['Network & VPN'],
  },
  {
    id: 'usr-rahul',
    employee_id: 'EMP-103',
    name: 'Rahul Verma',
    email: 'rahul.verma@resolvehub.com',
    role: 'EMPLOYEE',
    department_id: 'dept-hr',
    is_active: true,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
    department: MOCK_DEPARTMENTS[1],
    responsibilities: ['Leave & Attendance', 'Benefits & Insurance'],
  },
  {
    id: 'usr-rohit',
    employee_id: 'EMP-104',
    name: 'Rohit Singh',
    email: 'rohit.singh@resolvehub.com',
    role: 'EMPLOYEE',
    department_id: 'dept-fin',
    is_active: true,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
    department: MOCK_DEPARTMENTS[2],
    responsibilities: ['Invoicing & Expenses', 'Payroll Queries'],
  },
  {
    id: 'usr-jane',
    employee_id: 'EMP-105',
    name: 'Jane Doe',
    email: 'employee@resolvehub.com',
    role: 'EMPLOYEE',
    department_id: 'dept-hr',
    is_active: true,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
    department: MOCK_DEPARTMENTS[1],
    responsibilities: [],
  },
  {
    id: 'usr-admin',
    employee_id: 'ADM-001',
    name: 'Super Admin',
    email: 'admin@resolvehub.com',
    role: 'SUPER_ADMIN',
    department_id: 'dept-it',
    is_active: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
    department: MOCK_DEPARTMENTS[0],
    responsibilities: ['System Administration', 'All Queues'],
  },
];

/**
 * CATEGORIES with designated Responsible Employee
 */
export const MOCK_CATEGORIES: Category[] = [
  {
    id: 'cat-hw',
    department_id: 'dept-it',
    name: 'Hardware Issues',
    description: 'Physical computers, laptops, docks, and peripherals',
    is_active: true,
    responsible_employee_id: 'usr-amit',
    responsible_employee: MOCK_USERS[0],
    created_at: '2026-01-10T09:00:00Z',
    updated_at: '2026-01-10T09:00:00Z',
    department: MOCK_DEPARTMENTS[0],
  },
  {
    id: 'cat-sw',
    department_id: 'dept-it',
    name: 'Software & Licenses',
    description: 'OS, software installation, license keys, and bugs',
    is_active: true,
    responsible_employee_id: 'usr-amit',
    responsible_employee: MOCK_USERS[0],
    created_at: '2026-01-10T09:00:00Z',
    updated_at: '2026-01-10T09:00:00Z',
    department: MOCK_DEPARTMENTS[0],
  },
  {
    id: 'cat-net',
    department_id: 'dept-it',
    name: 'Network & VPN',
    description: 'Office Wi-Fi, Ethernet, VPN certificates, and connectivity',
    is_active: true,
    responsible_employee_id: 'usr-priya',
    responsible_employee: MOCK_USERS[1],
    created_at: '2026-01-10T09:00:00Z',
    updated_at: '2026-01-10T09:00:00Z',
    department: MOCK_DEPARTMENTS[0],
  },
  {
    id: 'cat-leave',
    department_id: 'dept-hr',
    name: 'Leave & Attendance',
    description: 'Annual leave, sick leave balance, and holiday calendars',
    is_active: true,
    responsible_employee_id: 'usr-rahul',
    responsible_employee: MOCK_USERS[2],
    created_at: '2026-01-10T09:00:00Z',
    updated_at: '2026-01-10T09:00:00Z',
    department: MOCK_DEPARTMENTS[1],
  },
  {
    id: 'cat-payroll',
    department_id: 'dept-fin',
    name: 'Payroll Queries',
    description: 'Monthly paystubs, tax withholding, and direct deposit',
    is_active: true,
    responsible_employee_id: 'usr-rohit',
    responsible_employee: MOCK_USERS[3],
    created_at: '2026-01-10T09:00:00Z',
    updated_at: '2026-01-10T09:00:00Z',
    department: MOCK_DEPARTMENTS[2],
  },
  {
    id: 'cat-expense',
    department_id: 'dept-fin',
    name: 'Invoicing & Expenses',
    description: 'Business expense claims, travel reimbursements, vendor invoices',
    is_active: true,
    responsible_employee_id: 'usr-rohit',
    responsible_employee: MOCK_USERS[3],
    created_at: '2026-01-10T09:00:00Z',
    updated_at: '2026-01-10T09:00:00Z',
    department: MOCK_DEPARTMENTS[2],
  },
];

/**
 * SUBCATEGORIES
 */
export const MOCK_SUBCATEGORIES: Subcategory[] = [
  {
    id: 'subcat-laptop',
    category_id: 'cat-hw',
    name: 'Laptop Battery / Power',
    description: 'Battery drains rapidly or charger failure',
    is_active: true,
    created_at: '2026-01-10T09:00:00Z',
    updated_at: '2026-01-10T09:00:00Z',
  },
  {
    id: 'subcat-display',
    category_id: 'cat-hw',
    name: 'External Display',
    description: 'Monitor HDMI / Type-C connectivity issues',
    is_active: true,
    created_at: '2026-01-10T09:00:00Z',
    updated_at: '2026-01-10T09:00:00Z',
  },
  {
    id: 'subcat-vpn',
    category_id: 'cat-net',
    name: 'VPN Certificate Renewal',
    description: 'VPN token expired or connection dropped',
    is_active: true,
    created_at: '2026-01-10T09:00:00Z',
    updated_at: '2026-01-10T09:00:00Z',
  },
  {
    id: 'subcat-paystub',
    category_id: 'cat-payroll',
    name: 'Tax Deduction Mismatch',
    description: 'Discrepancy in monthly TDS or tax statement',
    is_active: true,
    created_at: '2026-01-10T09:00:00Z',
    updated_at: '2026-01-10T09:00:00Z',
  },
];

/**
 * RESPONSIBILITY / ROUTING CONFIGURATION
 * Department -> Category -> Responsible Employee
 */
export const MOCK_RESPONSIBILITIES: CategoryResponsibility[] = [
  {
    id: 'resp-1',
    department_id: 'dept-it',
    department_name: 'IT Support',
    category_id: 'cat-hw',
    category_name: 'Hardware Issues',
    responsible_employee_id: 'usr-amit',
    responsible_employee_name: 'Amit Patel',
    responsible_employee_email: 'amit.patel@resolvehub.com',
    backup_employee_id: 'usr-priya',
    backup_employee_name: 'Priya Sharma',
    updated_at: '2026-02-01T10:00:00Z',
  },
  {
    id: 'resp-2',
    department_id: 'dept-it',
    department_name: 'IT Support',
    category_id: 'cat-sw',
    category_name: 'Software & Licenses',
    responsible_employee_id: 'usr-amit',
    responsible_employee_name: 'Amit Patel',
    responsible_employee_email: 'amit.patel@resolvehub.com',
    backup_employee_id: 'usr-priya',
    backup_employee_name: 'Priya Sharma',
    updated_at: '2026-02-01T10:00:00Z',
  },
  {
    id: 'resp-3',
    department_id: 'dept-it',
    department_name: 'IT Support',
    category_id: 'cat-net',
    category_name: 'Network & VPN',
    responsible_employee_id: 'usr-priya',
    responsible_employee_name: 'Priya Sharma',
    responsible_employee_email: 'priya.sharma@resolvehub.com',
    backup_employee_id: 'usr-amit',
    backup_employee_name: 'Amit Patel',
    updated_at: '2026-02-01T10:00:00Z',
  },
  {
    id: 'resp-4',
    department_id: 'dept-hr',
    department_name: 'Human Resources',
    category_id: 'cat-leave',
    category_name: 'Leave & Attendance',
    responsible_employee_id: 'usr-rahul',
    responsible_employee_name: 'Rahul Verma',
    responsible_employee_email: 'rahul.verma@resolvehub.com',
    backup_employee_id: null,
    backup_employee_name: null,
    updated_at: '2026-02-01T10:00:00Z',
  },
  {
    id: 'resp-5',
    department_id: 'dept-fin',
    department_name: 'Finance & Payroll',
    category_id: 'cat-payroll',
    category_name: 'Payroll Queries',
    responsible_employee_id: 'usr-rohit',
    responsible_employee_name: 'Rohit Singh',
    responsible_employee_email: 'rohit.singh@resolvehub.com',
    backup_employee_id: null,
    backup_employee_name: null,
    updated_at: '2026-02-01T10:00:00Z',
  },
  {
    id: 'resp-6',
    department_id: 'dept-fin',
    department_name: 'Finance & Payroll',
    category_id: 'cat-expense',
    category_name: 'Invoicing & Expenses',
    responsible_employee_id: 'usr-rohit',
    responsible_employee_name: 'Rohit Singh',
    responsible_employee_email: 'rohit.singh@resolvehub.com',
    backup_employee_id: null,
    backup_employee_name: null,
    updated_at: '2026-02-01T10:00:00Z',
  },
];

/**
 * TICKETS
 */
export const MOCK_TICKETS: Ticket[] = [
  {
    id: 'tkt-001',
    ticket_number: 'TKT-000101',
    title: 'MacBook external monitor flickers over Type-C',
    description: 'When connected to Dell U2720Q via USB-C, the screen goes black every 3-5 minutes.',
    created_by: 'usr-jane',
    category_id: 'cat-hw',
    subcategory_id: 'subcat-display',
    assigned_to: 'usr-amit', // Amit Patel is the responsible employee for Hardware
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    created_at: '2026-03-20T11:20:00Z',
    updated_at: '2026-03-21T09:15:00Z',
    creator: MOCK_USERS[4],
    assignee: MOCK_USERS[0],
    category: MOCK_CATEGORIES[0],
    subcategory: MOCK_SUBCATEGORIES[1],
  },
  {
    id: 'tkt-002',
    ticket_number: 'TKT-000102',
    title: 'VPN certificate expired for remote work',
    description: 'Cannot connect to Bangalore dev cluster gateway from home office.',
    created_by: 'usr-jane',
    category_id: 'cat-net',
    subcategory_id: 'subcat-vpn',
    assigned_to: 'usr-priya', // Priya Sharma is the responsible employee for Network
    priority: 'CRITICAL',
    status: 'OPEN',
    created_at: '2026-03-22T08:45:00Z',
    updated_at: '2026-03-22T08:45:00Z',
    creator: MOCK_USERS[4],
    assignee: MOCK_USERS[1],
    category: MOCK_CATEGORIES[2],
    subcategory: MOCK_SUBCATEGORIES[2],
  },
  {
    id: 'tkt-003',
    ticket_number: 'TKT-000103',
    title: 'Medical reimbursement form submission error',
    description: 'Form throws 413 error when uploading PDF hospital bills over 5MB.',
    created_by: 'usr-amit',
    category_id: 'cat-expense',
    assigned_to: 'usr-rohit', // Rohit Singh is responsible for Invoicing/Expenses
    priority: 'MEDIUM',
    status: 'RESOLVED',
    resolved_at: '2026-03-21T14:30:00Z',
    created_at: '2026-03-19T14:00:00Z',
    updated_at: '2026-03-21T14:30:00Z',
    creator: MOCK_USERS[0],
    assignee: MOCK_USERS[3],
    category: MOCK_CATEGORIES[5],
  },
  {
    id: 'tkt-004',
    ticket_number: 'TKT-000104',
    title: 'Earned leave balance deduction incorrect after bereavement leave',
    description: '3 days deducted from privilege leave instead of special bereavement category.',
    created_by: 'usr-priya',
    category_id: 'cat-leave',
    assigned_to: 'usr-rahul', // Rahul Verma is responsible for Leave
    priority: 'LOW',
    status: 'CLOSED',
    resolved_at: '2026-03-18T16:00:00Z',
    closed_at: '2026-03-19T10:00:00Z',
    created_at: '2026-03-17T10:00:00Z',
    updated_at: '2026-03-19T10:00:00Z',
    creator: MOCK_USERS[1],
    assignee: MOCK_USERS[2],
    category: MOCK_CATEGORIES[3],
  },
  {
    id: 'tkt-005',
    ticket_number: 'TKT-000105',
    title: 'Figma Organization enterprise seat provisioning',
    description: 'Need enterprise license for newly hired product designer on my team.',
    created_by: 'usr-rahul',
    category_id: 'cat-sw',
    assigned_to: 'usr-amit', // Amit Patel is responsible for Software
    priority: 'HIGH',
    status: 'WAITING_FOR_USER',
    created_at: '2026-03-23T11:00:00Z',
    updated_at: '2026-03-23T15:20:00Z',
    creator: MOCK_USERS[2],
    assignee: MOCK_USERS[0],
    category: MOCK_CATEGORIES[1],
  },
];

/**
 * SLA POLICIES
 */
export const MOCK_SLA_RULES: SlaRule[] = [
  {
    priority: 'CRITICAL',
    firstResponseHours: 1,
    resolutionHours: 4,
    escalateTo: 'Super Admin & Department Lead',
    description: 'Complete outage or blocker affecting business continuity',
  },
  {
    priority: 'HIGH',
    firstResponseHours: 4,
    resolutionHours: 12,
    escalateTo: 'Department Lead',
    description: 'Significant impairment of regular employee duties',
  },
  {
    priority: 'MEDIUM',
    firstResponseHours: 8,
    resolutionHours: 24,
    escalateTo: 'Responsible Employee Backup',
    description: 'Standard issue with functional workarounds available',
  },
  {
    priority: 'LOW',
    firstResponseHours: 24,
    resolutionHours: 72,
    escalateTo: 'Queue Manager',
    description: 'Minor inquiries, routine requests, or documentation questions',
  },
];

/**
 * ESCALATIONS (For Admin Dashboard)
 */
export const MOCK_ESCALATIONS: EscalationItem[] = [
  {
    id: 'esc-1',
    ticket_number: 'TKT-000102',
    title: 'VPN certificate expired for remote work',
    priority: 'CRITICAL',
    department: 'IT Support',
    responsible_employee_name: 'Priya Sharma',
    hours_elapsed: 5.5,
    sla_limit_hours: 4.0,
    status: 'OPEN',
  },
  {
    id: 'esc-2',
    ticket_number: 'TKT-000098',
    title: 'Production database backup verification failure',
    priority: 'CRITICAL',
    department: 'IT Support',
    responsible_employee_name: 'Amit Patel',
    hours_elapsed: 4.2,
    sla_limit_hours: 4.0,
    status: 'IN_PROGRESS',
  },
];

/**
 * KNOWLEDGE BASE / FAQS
 */
export const MOCK_FAQS: FaqItem[] = [
  {
    id: 'faq-1',
    question: 'How do I request a replacement laptop charger?',
    answer: 'Submit an IT Support ticket under Hardware Issues. The responsible IT employee will arrange pickup at the 3rd floor reception.',
    department_name: 'IT Support',
    category_name: 'Hardware Issues',
    views: 420,
    helpful_count: 85,
  },
  {
    id: 'faq-2',
    question: 'Where can I download my annual Form 16 / tax statement?',
    answer: 'Form 16 is published annually by the Finance department in the payroll portal under Tax Documents every June 15.',
    department_name: 'Finance & Payroll',
    category_name: 'Payroll Queries',
    views: 890,
    helpful_count: 210,
  },
  {
    id: 'faq-3',
    question: 'What is the policy for carry-forward leaves?',
    answer: 'Up to 15 earned leaves can be carried over into the new calendar year. Unused leaves beyond 15 lapse on Dec 31.',
    department_name: 'Human Resources',
    category_name: 'Leave & Attendance',
    views: 650,
    helpful_count: 140,
  },
];

/**
 * NOTIFICATIONS
 */
export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    user_id: 'usr-jane',
    title: 'Ticket In Progress',
    message: 'Amit Patel started working on your ticket TKT-000101.',
    is_read: false,
    created_at: '2026-03-21T09:15:00Z',
    ticket_id: 'tkt-001',
    ticket_number: 'TKT-000101',
  },
  {
    id: 'notif-2',
    user_id: 'usr-amit',
    title: 'New Responsibility Assigned',
    message: 'Super Admin assigned you as Responsible Employee for Software & Licenses.',
    is_read: true,
    created_at: '2026-02-01T10:00:00Z',
  },
  {
    id: 'notif-3',
    user_id: 'usr-jane',
    title: 'Ticket Resolved',
    message: 'Rohit Singh marked your ticket TKT-000103 as resolved.',
    is_read: true,
    created_at: '2026-03-21T14:30:00Z',
    ticket_id: 'tkt-003',
    ticket_number: 'TKT-000103',
  },
];
