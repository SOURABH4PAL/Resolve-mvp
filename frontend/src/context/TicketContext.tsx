import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Ticket,
  Department,
  Category,
  Subcategory,
  TicketPriority,
  TicketStatus,
  TicketComment,
  TicketAttachment,
  TicketJourneyEvent,
  CategoryResponsibility,
  User,
} from '../types';
import { api } from '../api/client';
import { useAuth } from './AuthContext';
import {
  MOCK_DEPARTMENTS,
  MOCK_CATEGORIES,
  MOCK_RESPONSIBILITIES,
  MOCK_USERS,
} from '../mock/mockData';

export interface BulkAssignDepartmentResult {
  department_id: string;
  department_name: string;
  updated_count: number;
  failed_count: number;
  successful_user_ids: string[];
  failed_user_ids: string[];
}

interface TicketContextType {
  tickets: Ticket[];
  departments: Department[];
  categories: Category[];
  responsibilities: CategoryResponsibility[];
  employees: User[];
  isLoadingTickets: boolean;
  isLoadingMasterData: boolean;
  error: string | null;
  fetchTickets: (params?: Record<string, any>) => Promise<void>;
  fetchMasterData: () => Promise<void>;
  getTicketById: (ticketId: string) => Promise<Ticket>;
  createTicket: (data: {
    title: string;
    description: string;
    category_id?: string | null;
    subcategory_id?: string | null;
    priority: TicketPriority;
  }) => Promise<Ticket>;
  updateTicketStatus: (ticketId: string, status: TicketStatus, comment?: string) => Promise<Ticket>;
  resolveTicket: (ticketId: string, resolution_notes?: string) => Promise<Ticket>;
  closeTicket: (ticketId: string) => Promise<Ticket>;
  reopenTicket: (ticketId: string, reason?: string) => Promise<Ticket>;
  assignTicket: (ticketId: string, employeeId: string, employeeName?: string) => Promise<void>;
  blockTicket: (ticketId: string, reason: string) => Promise<Ticket>;
  unblockTicket: (ticketId: string, reason?: string) => Promise<Ticket>;
  getTicketJourney: (ticketId: string) => Promise<TicketJourneyEvent[]>;
  bulkAssignDepartment: (userIds: string[], departmentId: string) => Promise<BulkAssignDepartmentResult>;
  createCategory: (departmentId: string, name: string, description?: string) => Promise<Category>;
  createSubcategory: (categoryId: string, name: string, description?: string) => Promise<Subcategory>;
  updateCategoryResponsibility: (
    responsibilityId: string,
    responsibleEmployeeId: string,
    responsibleEmployeeName: string,
    responsibleEmployeeEmail: string
  ) => void;
  getComments: (ticketId: string) => Promise<TicketComment[]>;
  addComment: (ticketId: string, content: string, is_internal?: boolean) => Promise<TicketComment>;
  getAttachments: (ticketId: string) => Promise<TicketAttachment[]>;
  uploadAttachment: (ticketId: string, file: File) => Promise<TicketAttachment>;
  getCategoriesByDepartment: (departmentId: string) => Category[];
}

const TicketContext = createContext<TicketContextType | undefined>(undefined);

export const TicketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [departments, setDepartments] = useState<Department[]>(MOCK_DEPARTMENTS);
  const [categories, setCategories] = useState<Category[]>(MOCK_CATEGORIES);
  const [responsibilities, setResponsibilities] = useState<CategoryResponsibility[]>(MOCK_RESPONSIBILITIES);
  const [employees, setEmployees] = useState<User[]>(MOCK_USERS.filter(u => u.role === 'EMPLOYEE'));
  const [isLoadingTickets, setIsLoadingTickets] = useState<boolean>(false);
  const [isLoadingMasterData, setIsLoadingMasterData] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMasterData = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingMasterData(true);
    try {
      const [deptList, catList, empList] = await Promise.all([
        api.get<Department[]>('/departments').catch(() => null),
        api.get<Category[]>('/categories').catch(() => null),
        api.get<User[]>('/users').catch(() => null),
      ]);
      if (Array.isArray(deptList)) {
        setDepartments(deptList);
      }
      if (Array.isArray(catList)) {
        setCategories(catList);
      }
      if (Array.isArray(empList)) {
        setEmployees(empList);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch master data';
      setError(msg);
    } finally {
      setIsLoadingMasterData(false);
    }
  }, [isAuthenticated]);

  const fetchTickets = useCallback(async (params?: Record<string, any>) => {
    if (!isAuthenticated) return;
    setIsLoadingTickets(true);
    setError(null);
    try {
      let url = '/tickets';
      if (params && Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== 'ALL' && v !== '') {
            searchParams.append(k, String(v));
          }
        });
        const qs = searchParams.toString();
        if (qs) url += `?${qs}`;
      }
      const ticketList = await api.get<Ticket[]>(url).catch(() => null);
      if (Array.isArray(ticketList)) {
        setTickets(ticketList);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch tickets';
      setError(msg);
    } finally {
      setIsLoadingTickets(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMasterData();
      fetchTickets();
    } else {
      setTickets([]);
      setDepartments(MOCK_DEPARTMENTS);
      setCategories(MOCK_CATEGORIES);
    }
  }, [isAuthenticated, fetchMasterData, fetchTickets]);

  const getTicketById = async (ticketId: string): Promise<Ticket> => {
    try {
      return await api.get<Ticket>(`/tickets/${ticketId}`);
    } catch {
      const found = tickets.find(t => t.id === ticketId || t.ticket_number === ticketId);
      if (found) return found;
      throw new Error('Ticket not found');
    }
  };

  const createTicket = async (data: {
    title: string;
    description: string;
    category_id?: string | null;
    subcategory_id?: string | null;
    priority: TicketPriority;
  }): Promise<Ticket> => {
    const payload = {
      ...data,
      category_id: data.category_id || undefined,
      subcategory_id: data.subcategory_id || undefined,
    };
    const newTicket = await api.post<Ticket>('/tickets', payload);
    setTickets(prev => [newTicket, ...prev]);
    return newTicket;
  };

  const updateTicketStatus = async (
    ticketId: string,
    status: TicketStatus,
    comment?: string
  ): Promise<Ticket> => {
    const updated = await api.put<Ticket>(`/tickets/${ticketId}/status`, {
      status,
      comment,
    });
    setTickets(prev => prev.map(t => (t.id === ticketId || t.ticket_number === ticketId ? updated : t)));
    return updated;
  };

  const resolveTicket = async (
    ticketId: string,
    resolution_notes?: string
  ): Promise<Ticket> => {
    const updated = await api.put<Ticket>(`/tickets/${ticketId}/resolve`, {
      resolution_notes,
    });
    setTickets(prev => prev.map(t => (t.id === ticketId || t.ticket_number === ticketId ? updated : t)));
    return updated;
  };

  const closeTicket = async (ticketId: string): Promise<Ticket> => {
    const updated = await api.put<Ticket>(`/tickets/${ticketId}/close`);
    setTickets(prev => prev.map(t => (t.id === ticketId || t.ticket_number === ticketId ? updated : t)));
    return updated;
  };

  const reopenTicket = async (ticketId: string, reason?: string): Promise<Ticket> => {
    // Valid backend transition for reopen from RESOLVED is IN_PROGRESS
    return await updateTicketStatus(ticketId, 'IN_PROGRESS', reason || 'Reopened and returned to work queue.');
  };

  const assignTicket = async (ticketId: string, employeeId: string, employeeName?: string): Promise<void> => {
    const updated = await api.put<Ticket>(`/tickets/${ticketId}/assign`, {
      assignee_id: employeeId,
    });
    setTickets(prev => prev.map(t => (t.id === ticketId || t.ticket_number === ticketId ? updated : t)));
  };

  const blockTicket = async (ticketId: string, reason: string): Promise<Ticket> => {
    const updated = await api.put<Ticket>(`/tickets/${ticketId}/block`, {
      reason,
    });
    setTickets(prev => prev.map(t => (t.id === ticketId || t.ticket_number === ticketId ? updated : t)));
    return updated;
  };

  const unblockTicket = async (ticketId: string, reason?: string): Promise<Ticket> => {
    const updated = await api.put<Ticket>(`/tickets/${ticketId}/unblock`, {
      reason,
    });
    setTickets(prev => prev.map(t => (t.id === ticketId || t.ticket_number === ticketId ? updated : t)));
    return updated;
  };

  const getTicketJourney = async (ticketId: string): Promise<TicketJourneyEvent[]> => {
    return await api.get<TicketJourneyEvent[]>(`/tickets/${ticketId}/journey`);
  };

  const bulkAssignDepartment = async (
    userIds: string[],
    departmentId: string
  ): Promise<BulkAssignDepartmentResult> => {
    const res = await api.post<BulkAssignDepartmentResult>('/users/bulk-assign-department', {
      user_ids: userIds,
      department_id: departmentId,
    });
    await fetchMasterData();
    return res;
  };

  const createCategory = async (
    departmentId: string,
    name: string,
    description?: string
  ): Promise<Category> => {
    const created = await api.post<Category>('/categories', {
      department_id: departmentId,
      name,
      description,
      is_active: true,
    });
    setCategories(prev => [...prev, created]);
    return created;
  };

  const createSubcategory = async (
    categoryId: string,
    name: string,
    description?: string
  ): Promise<Subcategory> => {
    const created = await api.post<Subcategory>('/subcategories', {
      category_id: categoryId,
      name,
      description,
      is_active: true,
    });
    return created;
  };

  const updateCategoryResponsibility = (
    responsibilityId: string,
    responsibleEmployeeId: string,
    responsibleEmployeeName: string,
    responsibleEmployeeEmail: string
  ) => {
    setResponsibilities(prev =>
      prev.map(r => {
        if (r.id === responsibilityId) {
          return {
            ...r,
            responsible_employee_id: responsibleEmployeeId,
            responsible_employee_name: responsibleEmployeeName,
            responsible_employee_email: responsibleEmployeeEmail,
            updated_at: new Date().toISOString(),
          };
        }
        return r;
      })
    );
  };

  const getComments = async (ticketId: string): Promise<TicketComment[]> => {
    try {
      return await api.get<TicketComment[]>(`/tickets/${ticketId}/comments`);
    } catch {
      return [];
    }
  };

  const addComment = async (
    ticketId: string,
    content: string,
    is_internal: boolean = false
  ): Promise<TicketComment> => {
    return await api.post<TicketComment>(`/tickets/${ticketId}/comments`, {
      content,
      is_internal,
    });
  };

  const getAttachments = async (ticketId: string): Promise<TicketAttachment[]> => {
    try {
      return await api.get<TicketAttachment[]>(`/tickets/${ticketId}/attachments`);
    } catch {
      return [];
    }
  };

  const uploadAttachment = async (ticketId: string, file: File): Promise<TicketAttachment> => {
    const formData = new FormData();
    formData.append('file', file);
    return await api.upload<TicketAttachment>(`/tickets/${ticketId}/attachments`, formData);
  };

  const getCategoriesByDepartment = (departmentId: string): Category[] => {
    return categories.filter(c => c.department_id === departmentId);
  };

  return (
    <TicketContext.Provider
      value={{
        tickets,
        departments,
        categories,
        responsibilities,
        employees,
        isLoadingTickets,
        isLoadingMasterData,
        error,
        fetchTickets,
        fetchMasterData,
        getTicketById,
        createTicket,
        updateTicketStatus,
        resolveTicket,
        closeTicket,
        reopenTicket,
        assignTicket,
        blockTicket,
        unblockTicket,
        getTicketJourney,
        bulkAssignDepartment,
        createCategory,
        createSubcategory,
        updateCategoryResponsibility,
        getComments,
        addComment,
        getAttachments,
        uploadAttachment,
        getCategoriesByDepartment,
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
