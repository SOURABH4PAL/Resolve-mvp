import React, { createContext, useContext, useState } from 'react';
import { Ticket, Department, Category, NotificationItem, TicketPriority, TicketStatus } from '../types';
import { MOCK_DEPARTMENTS, MOCK_CATEGORIES, MOCK_TICKETS, MOCK_NOTIFICATIONS, MOCK_USERS } from '../mock/mockData';
import { useAuth } from './AuthContext';

interface TicketContextType {
  tickets: Ticket[];
  departments: Department[];
  categories: Category[];
  notifications: NotificationItem[];
  unreadNotificationsCount: number;
  getCategoriesByDepartment: (departmentId: string) => Category[];
  getDepartmentByCategory: (categoryId: string) => Department | undefined;
  getTicketById: (ticketId: string) => Ticket | undefined;
  createTicket: (data: {
    title: string;
    description: string;
    categoryId: string;
    priority: TicketPriority;
    attachmentNames?: string[];
  }) => Ticket;
  updateTicketStatus: (ticketId: string, status: TicketStatus) => void;
  updateTicketPriority: (ticketId: string, priority: TicketPriority) => void;
  assignTicket: (ticketId: string, assigneeId: string) => void;
  addComment: (ticketId: string, commentText: string, isInternal?: boolean) => void;
  addAttachment: (ticketId: string, fileName: string, fileSize?: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
}

const TicketContext = createContext<TicketContextType | undefined>(undefined);

export const TicketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>(MOCK_TICKETS);
  const [departments] = useState<Department[]>(MOCK_DEPARTMENTS);
  const [categories] = useState<Category[]>(MOCK_CATEGORIES);
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);

  const getCategoriesByDepartment = (departmentId: string): Category[] => {
    return categories.filter(c => c.department_id === departmentId && c.is_active);
  };

  const getDepartmentByCategory = (categoryId: string): Department | undefined => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return undefined;
    return departments.find(d => d.id === category.department_id);
  };

  const getTicketById = (ticketId: string): Ticket | undefined => {
    return tickets.find(t => t.id === ticketId || t.ticket_number === ticketId);
  };

  const createTicket = (data: {
    title: string;
    description: string;
    categoryId: string;
    priority: TicketPriority;
    attachmentNames?: string[];
  }): Ticket => {
    const nextNum = 1000 + tickets.length + 1;
    const ticketNumber = `RH-${nextNum}`;
    const category = categories.find(c => c.id === data.categoryId);
    const department = category ? departments.find(d => d.id === category.department_id) : undefined;

    const newTicket: Ticket = {
      id: `t-${Date.now()}`,
      ticket_number: ticketNumber,
      title: data.title,
      description: data.description,
      created_by: currentUser ? currentUser.id : 'usr-1',
      creator_name: currentUser ? currentUser.name : 'Alex Morgan',
      creator_email: currentUser ? currentUser.email : 'alex.morgan@dailoqa.internal',
      category_id: data.categoryId,
      category_name: category ? category.name : 'General',
      department_id: department ? department.id : 'dept-1',
      department_name: department ? department.name : 'IT Support',
      assigned_to: null,
      assignee_name: null,
      priority: data.priority,
      status: 'OPEN',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      resolved_at: null,
      comments: [],
      attachments: (data.attachmentNames || []).map((name, i) => ({
        id: `att-${Date.now()}-${i}`,
        ticket_id: `t-${Date.now()}`,
        uploaded_by: currentUser?.id || 'usr-1',
        uploader_name: currentUser?.name || 'Alex Morgan',
        file_name: name,
        file_path: `/onedrive/tickets/new/${name}`,
        file_size: '240 KB',
        created_at: new Date().toISOString(),
      })),
    };

    setTickets(prev => [newTicket, ...prev]);

    // Create Notification
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      user_id: currentUser?.id || 'usr-1',
      title: `Ticket Created: ${ticketNumber}`,
      message: `Your ticket "${newTicket.title}" has been successfully logged with status OPEN.`,
      is_read: false,
      created_at: new Date().toISOString(),
      ticket_id: newTicket.id,
      ticket_number: newTicket.ticket_number,
    };
    setNotifications(prev => [newNotif, ...prev]);

    return newTicket;
  };

  const updateTicketStatus = (ticketId: string, status: TicketStatus) => {
    setTickets(prev =>
      prev.map(t => {
        if (t.id === ticketId || t.ticket_number === ticketId) {
          const now = new Date().toISOString();
          const resolvedAt = status === 'RESOLVED' || status === 'CLOSED' ? (t.resolved_at || now) : null;
          return {
            ...t,
            status,
            updated_at: now,
            resolved_at: resolvedAt,
          };
        }
        return t;
      })
    );

    const ticket = getTicketById(ticketId);
    if (ticket) {
      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        user_id: ticket.created_by,
        title: `Status Updated: ${ticket.ticket_number}`,
        message: `Status of ticket "${ticket.title}" changed to ${status.replace('_', ' ')}.`,
        is_read: false,
        created_at: new Date().toISOString(),
        ticket_id: ticket.id,
        ticket_number: ticket.ticket_number,
      };
      setNotifications(prev => [newNotif, ...prev]);
    }
  };

  const updateTicketPriority = (ticketId: string, priority: TicketPriority) => {
    setTickets(prev =>
      prev.map(t => {
        if (t.id === ticketId || t.ticket_number === ticketId) {
          return {
            ...t,
            priority,
            updated_at: new Date().toISOString(),
          };
        }
        return t;
      })
    );
  };

  const assignTicket = (ticketId: string, assigneeId: string) => {
    const assignee = MOCK_USERS.find(u => u.id === assigneeId);
    setTickets(prev =>
      prev.map(t => {
        if (t.id === ticketId || t.ticket_number === ticketId) {
          return {
            ...t,
            assigned_to: assigneeId,
            assignee_name: assignee ? assignee.name : 'Assigned Resolver',
            status: t.status === 'OPEN' ? 'IN_PROGRESS' : t.status,
            updated_at: new Date().toISOString(),
          };
        }
        return t;
      })
    );
  };

  const addComment = (ticketId: string, commentText: string, isInternal: boolean = false) => {
    if (!commentText.trim()) return;
    const author = currentUser || MOCK_USERS[0];
    const newComment = {
      id: `c-${Date.now()}`,
      ticket_id: ticketId,
      user_id: author.id,
      user_name: author.name,
      user_role: author.role,
      comment: commentText.trim(),
      is_internal: isInternal,
      created_at: new Date().toISOString(),
    };

    setTickets(prev =>
      prev.map(t => {
        if (t.id === ticketId || t.ticket_number === ticketId) {
          return {
            ...t,
            updated_at: new Date().toISOString(),
            comments: [...(t.comments || []), newComment],
          };
        }
        return t;
      })
    );
  };

  const addAttachment = (ticketId: string, fileName: string, fileSize: string = '350 KB') => {
    const author = currentUser || MOCK_USERS[0];
    const newAtt = {
      id: `att-${Date.now()}`,
      ticket_id: ticketId,
      uploaded_by: author.id,
      uploader_name: author.name,
      file_name: fileName,
      file_path: `/onedrive/tickets/${ticketId}/${fileName}`,
      file_size: fileSize,
      created_at: new Date().toISOString(),
    };

    setTickets(prev =>
      prev.map(t => {
        if (t.id === ticketId || t.ticket_number === ticketId) {
          return {
            ...t,
            updated_at: new Date().toISOString(),
            attachments: [...(t.attachments || []), newAtt],
          };
        }
        return t;
      })
    );
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const unreadNotificationsCount = notifications.filter(n => !n.is_read).length;

  return (
    <TicketContext.Provider
      value={{
        tickets,
        departments,
        categories,
        notifications,
        unreadNotificationsCount,
        getCategoriesByDepartment,
        getDepartmentByCategory,
        getTicketById,
        createTicket,
        updateTicketStatus,
        updateTicketPriority,
        assignTicket,
        addComment,
        addAttachment,
        markNotificationRead,
        markAllNotificationsRead,
      }}
    >
      {children}
    </TicketContext.Provider>
  );
};

export const useTickets = (): TicketContextType => {
  const context = useContext(TicketContext);
  if (!context) {
    throw new Error('useTickets must be used within a TicketProvider');
  }
  return context;
};
