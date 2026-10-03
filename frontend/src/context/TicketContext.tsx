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
  CategoryResponsibility,
  User,
} from '../types';
import { api, ApiError } from '../api/client';
import { useAuth } from './AuthContext';

interface TicketContextType {
  tickets: Ticket[];
  departments: Department[];
  categories: Category[];
  subcategories: Subcategory[];
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
  downloadAttachment: (attachmentId: string, filename: string) => Promise<void>;
  getCategoriesByDepartment: (departmentId: string) => Category[];
  getSubcategoriesByCategory: (categoryId: string) => Subcategory[];
}

const TicketContext = createContext<TicketContextType | undefined>(undefined);

export const TicketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAuthenticated } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [responsibilities, setResponsibilities] = useState<CategoryResponsibility[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState<boolean>(false);
  const [isLoadingMasterData, setIsLoadingMasterData] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMasterData = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingMasterData(true);
    try {
      const [deptList, catList, subList] = await Promise.all([
        api.get<Department[]>('/departments').catch(() => [] as Department[]),
        api.get<Category[]>('/categories').catch(() => [] as Category[]),
        api.get<Subcategory[]>('/subcategories').catch(() => [] as Subcategory[]),
      ]);

      setDepartments(deptList || []);
      setCategories(catList || []);
      setSubcategories(subList || []);

      // Connect to GET /api/users to load employee list
      try {
        const userList = await api.get<User[]>('/users');
        if (Array.isArray(userList)) {
          setEmployees(userList);
        }
      } catch (userErr: unknown) {
        // GET /api/users may not be implemented in the current backend
        // Maintain fallback list with currentUser if available
        if (currentUser) {
          setEmployees(prev => {
            if (prev.length === 0) return [currentUser];
            return prev;
          });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch master data';
      setError(msg);
    } finally {
      setIsLoadingMasterData(false);
    }
  }, [isAuthenticated, currentUser]);

  const fetchTickets = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingTickets(true);
    setError(null);
    try {
      const ticketList = await api.get<Ticket[]>('/tickets');
      setTickets(ticketList || []);

      // Extract known users from tickets to populate employees if GET /api/users is not implemented
      if (ticketList && ticketList.length > 0) {
        setEmployees(prev => {
          const userMap = new Map<string, User>();
          prev.forEach(u => userMap.set(u.id, u));
          if (currentUser) userMap.set(currentUser.id, currentUser);
          ticketList.forEach(t => {
            if (t.creator) userMap.set(t.creator.id, t.creator);
            if (t.assignee) userMap.set(t.assignee.id, t.assignee);
          });
          return Array.from(userMap.values());
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch tickets';
      setError(msg);
      setTickets([]);
    } finally {
      setIsLoadingTickets(false);
    }
  }, [isAuthenticated, currentUser]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMasterData();
      fetchTickets();
    } else {
      setTickets([]);
      setDepartments([]);
      setCategories([]);
      setSubcategories([]);
      setEmployees([]);
      setResponsibilities([]);
    }
  }, [isAuthenticated, fetchMasterData, fetchTickets]);

  const getTicketById = async (ticketId: string): Promise<Ticket> => {
    return await api.get<Ticket>(`/tickets/${ticketId}`);
  };

  const createTicket = async (data: {
    title: string;
    description: string;
    category_id: string;
    subcategory_id?: string;
    priority: TicketPriority;
  }): Promise<Ticket> => {
    const payload = {
      title: data.title,
      description: data.description,
      category_id: data.category_id,
      subcategory_id: data.subcategory_id || null,
      priority: data.priority,
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
    setTickets(prev => prev.map(t => (t.id === ticketId ? updated : t)));
    return updated;
  };

  const resolveTicket = async (
    ticketId: string,
    resolution_notes?: string
  ): Promise<Ticket> => {
    const updated = await api.put<Ticket>(`/tickets/${ticketId}/resolve`, {
      resolution_notes,
    });
    setTickets(prev => prev.map(t => (t.id === ticketId ? updated : t)));
    return updated;
  };

  const closeTicket = async (ticketId: string): Promise<Ticket> => {
    const updated = await api.put<Ticket>(`/tickets/${ticketId}/close`);
    setTickets(prev => prev.map(t => (t.id === ticketId ? updated : t)));
    return updated;
  };

  const reopenTicket = async (ticketId: string, reason?: string): Promise<Ticket> => {
    return await updateTicketStatus(ticketId, 'REOPENED', reason || 'Reopened by employee.');
  };

  const assignTicket = async (ticketId: string, employeeId: string, employeeName?: string): Promise<void> => {
    // Attempt dedicated assignment endpoint PUT /api/tickets/{id}/assign
    try {
      await api.put(`/tickets/${ticketId}/assign`, {
        assigned_to_user_id: employeeId,
      });
      await fetchTickets();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        // If /assign is not implemented on backend, try updating status or report clear message
        throw new ApiError(
          404,
          'Backend route PUT /api/tickets/{id}/assign is not implemented in the backend router.'
        );
      }
      throw err;
    }
  };

  const updateCategoryResponsibility = (
    responsibilityId: string,
    responsibleEmployeeId: string,
    responsibleEmployeeName: string,
    responsibleEmployeeEmail: string
  ) => {
    setResponsibilities(prev => {
      const exists = prev.some(r => r.id === responsibilityId);
      if (exists) {
        return prev.map(r =>
          r.id === responsibilityId
            ? {
                ...r,
                responsible_employee_id: responsibleEmployeeId,
                responsible_employee_name: responsibleEmployeeName,
                responsible_employee_email: responsibleEmployeeEmail,
                updated_at: new Date().toISOString(),
              }
            : r
        );
      }
      return [
        ...prev,
        {
          id: responsibilityId,
          department_id: '',
          category_id: '',
          category_name: '',
          department_name: '',
          responsible_employee_id: responsibleEmployeeId,
          responsible_employee_name: responsibleEmployeeName,
          responsible_employee_email: responsibleEmployeeEmail,
          updated_at: new Date().toISOString(),
        },
      ];
    });
  };

  const getComments = async (ticketId: string): Promise<TicketComment[]> => {
    return await api.get<TicketComment[]>(`/tickets/${ticketId}/comments`);
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
    return await api.get<TicketAttachment[]>(`/tickets/${ticketId}/attachments`);
  };

  const uploadAttachment = async (ticketId: string, file: File): Promise<TicketAttachment> => {
    const formData = new FormData();
    formData.append('file', file);
    return await api.upload<TicketAttachment>(`/tickets/${ticketId}/attachments`, formData);
  };

  const downloadAttachment = async (attachmentId: string, filename: string): Promise<void> => {
    await api.downloadFile(`/attachments/${attachmentId}/download`, filename);
  };

  const getCategoriesByDepartment = (departmentId: string): Category[] => {
    return categories.filter(c => c.department_id === departmentId);
  };

  const getSubcategoriesByCategory = (categoryId: string): Subcategory[] => {
    return subcategories.filter(s => s.category_id === categoryId);
  };

  return (
    <TicketContext.Provider
      value={{
        tickets,
        departments,
        categories,
        subcategories,
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
        downloadAttachment,
        getCategoriesByDepartment,
        getSubcategoriesByCategory,
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
