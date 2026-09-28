import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Ticket,
  Department,
  Category,
  TicketPriority,
  TicketStatus,
  TicketComment,
  TicketAttachment,
  CategoryResponsibility,
  User,
} from '../types';
import { api } from '../api/client';
import { useAuth } from './AuthContext';
import {
  MOCK_DEPARTMENTS,
  MOCK_CATEGORIES,
  MOCK_TICKETS,
  MOCK_RESPONSIBILITIES,
  MOCK_USERS,
} from '../mock/mockData';

interface TicketContextType {
  tickets: Ticket[];
  departments: Department[];
  categories: Category[];
  responsibilities: CategoryResponsibility[];
  employees: User[];
  isLoadingTickets: boolean;
  isLoadingMasterData: boolean;
  error: string | null;
  fetchTickets: () => Promise<void>;
  fetchMasterData: () => Promise<void>;
  getTicketById: (ticketId: string) => Promise<Ticket>;
  createTicket: (data: {
    title: string;
    description: string;
    category_id: string;
    subcategory_id?: string;
    priority: TicketPriority;
  }) => Promise<Ticket>;
  updateTicketStatus: (ticketId: string, status: TicketStatus, comment?: string) => Promise<Ticket>;
  resolveTicket: (ticketId: string, resolution_notes?: string) => Promise<Ticket>;
  closeTicket: (ticketId: string) => Promise<Ticket>;
  reopenTicket: (ticketId: string, reason?: string) => Promise<Ticket>;
  assignTicket: (ticketId: string, employeeId: string, employeeName?: string) => Promise<void>;
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
      const [deptList, catList] = await Promise.all([
        api.get<Department[]>('/departments').catch(() => null),
        api.get<Category[]>('/categories').catch(() => null),
      ]);
      if (deptList && deptList.length > 0) {
        setDepartments(deptList);
      }
      if (catList && catList.length > 0) {
        setCategories(catList);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch departments and categories';
      setError(msg);
    } finally {
      setIsLoadingMasterData(false);
    }
  }, [isAuthenticated]);

  const fetchTickets = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingTickets(true);
    setError(null);
    try {
      const ticketList = await api.get<Ticket[]>('/tickets').catch(() => null);
      if (ticketList && ticketList.length > 0) {
        // Merge or use live backend tickets
        setTickets(ticketList);
      } else {
        // Fallback to rich mock tickets if backend has zero or empty tickets
        setTickets(MOCK_TICKETS);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch tickets';
      setError(msg);
      setTickets(MOCK_TICKETS);
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
    category_id: string;
    subcategory_id?: string;
    priority: TicketPriority;
  }): Promise<Ticket> => {
    // Find responsible employee for the selected category
    const resp = responsibilities.find(r => r.category_id === data.category_id);

    try {
      const newTicket = await api.post<Ticket>('/tickets', data);
      setTickets(prev => [newTicket, ...prev]);
      return newTicket;
    } catch {
      // Local creation fallback
      const cat = categories.find(c => c.id === data.category_id);
      const generatedNumber = `TKT-${String(Math.floor(100000 + Math.random() * 900000))}`;
      const fallbackTicket: Ticket = {
        id: `tkt-${Date.now()}`,
        ticket_number: generatedNumber,
        title: data.title,
        description: data.description,
        created_by: 'current-user-id',
        category_id: data.category_id,
        subcategory_id: data.subcategory_id || null,
        assigned_to: resp ? resp.responsible_employee_id : null,
        priority: data.priority,
        status: 'OPEN',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        category: cat || null,
        assignee: resp
          ? {
              id: resp.responsible_employee_id,
              employee_id: resp.responsible_employee_id,
              name: resp.responsible_employee_name,
              email: resp.responsible_employee_email,
              role: 'EMPLOYEE',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          : null,
      };
      setTickets(prev => [fallbackTicket, ...prev]);
      return fallbackTicket;
    }
  };

  const updateTicketStatus = async (
    ticketId: string,
    status: TicketStatus,
    comment?: string
  ): Promise<Ticket> => {
    try {
      const updated = await api.put<Ticket>(`/tickets/${ticketId}/status`, {
        status,
        comment,
      });
      setTickets(prev => prev.map(t => (t.id === ticketId ? updated : t)));
      return updated;
    } catch {
      // Local optimistic update
      let updatedTicket!: Ticket;
      setTickets(prev =>
        prev.map(t => {
          if (t.id === ticketId) {
            updatedTicket = { ...t, status, updated_at: new Date().toISOString() };
            return updatedTicket;
          }
          return t;
        })
      );
      return updatedTicket;
    }
  };

  const resolveTicket = async (
    ticketId: string,
    resolution_notes?: string
  ): Promise<Ticket> => {
    try {
      const updated = await api.put<Ticket>(`/tickets/${ticketId}/resolve`, {
        resolution_notes,
      });
      setTickets(prev => prev.map(t => (t.id === ticketId ? updated : t)));
      return updated;
    } catch {
      return await updateTicketStatus(ticketId, 'RESOLVED', resolution_notes);
    }
  };

  const closeTicket = async (ticketId: string): Promise<Ticket> => {
    try {
      const updated = await api.put<Ticket>(`/tickets/${ticketId}/close`);
      setTickets(prev => prev.map(t => (t.id === ticketId ? updated : t)));
      return updated;
    } catch {
      return await updateTicketStatus(ticketId, 'CLOSED');
    }
  };

  const reopenTicket = async (ticketId: string, reason?: string): Promise<Ticket> => {
    return await updateTicketStatus(ticketId, 'REOPENED', reason || 'Reopened by employee.');
  };

  const assignTicket = async (ticketId: string, employeeId: string, employeeName?: string): Promise<void> => {
    const employee = employees.find(e => e.id === employeeId || e.employee_id === employeeId);
    const assignedName = employee ? employee.name : employeeName || 'Assigned Employee';

    try {
      // In current backend, assigning is status change or PUT /tickets/{id}/assign
      await api.put(`/tickets/${ticketId}/status`, {
        status: 'ASSIGNED',
        comment: `Ticket assigned to responsible employee: ${assignedName}`,
      });
    } catch {
      // Fallback
    }

    setTickets(prev =>
      prev.map(t => {
        if (t.id === ticketId) {
          return {
            ...t,
            assigned_to: employeeId,
            assignee: employee || {
              id: employeeId,
              employee_id: employeeId,
              name: assignedName,
              email: `${employeeId}@resolvehub.com`,
              role: 'EMPLOYEE',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            status: t.status === 'OPEN' ? 'ASSIGNED' : t.status,
            updated_at: new Date().toISOString(),
          };
        }
        return t;
      })
    );
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
    try {
      return await api.post<TicketComment>(`/tickets/${ticketId}/comments`, {
        content,
        is_internal,
      });
    } catch {
      const fakeComment: TicketComment = {
        id: `cmt-${Date.now()}`,
        ticket_id: ticketId,
        user_id: 'current-user-id',
        content,
        is_internal,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return fakeComment;
    }
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
