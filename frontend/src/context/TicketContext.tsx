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
  unreadNotificationCount: number;
  isLoadingTickets: boolean;
  isLoadingMasterData: boolean;
  error: string | null;
  fetchTickets: () => Promise<void>;
  fetchMasterData: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
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
    responsibleEmployeeEmail: string,
    categoryDetails?: {
      department_id?: string;
      department_name?: string;
      category_id?: string;
      category_name?: string;
      subcategory_id?: string;
      subcategory_name?: string;
    }
  ) => Promise<void>;
  removeCategoryResponsibility: (responsibilityId: string) => Promise<void>;
  getComments: (ticketId: string) => Promise<TicketComment[]>;
  addComment: (ticketId: string, content: string, is_internal?: boolean) => Promise<TicketComment>;
  getAttachments: (ticketId: string) => Promise<TicketAttachment[]>;
  uploadAttachment: (ticketId: string, file: File) => Promise<TicketAttachment>;
  downloadAttachment: (attachmentId: string, filename: string) => Promise<void>;
  getCategoriesByDepartment: (departmentId: string) => Category[];
  getSubcategoriesByCategory: (categoryId: string) => Subcategory[];
  createDepartment: (data: { name: string; department_email?: string }) => Promise<Department>;
  updateDepartment: (deptId: string, data: { name?: string; department_email?: string; is_active?: boolean }) => Promise<Department>;
  deleteDepartment: (deptId: string) => Promise<void>;
  createSubcategory: (data: { category_id: string; name: string; description?: string }) => Promise<Subcategory>;
  updateSubcategory: (subcatId: string, data: { name?: string; description?: string; category_id?: string; is_active?: boolean }) => Promise<Subcategory>;
  deleteSubcategory: (subcatId: string) => Promise<void>;
  createEmployee: (data: { employee_id: string; name: string; email: string; password?: string; role?: string; department_id?: string }) => Promise<User>;
  updateEmployee: (userId: string, data: { name?: string; email?: string; employee_id?: string; role?: string; department_id?: string; is_active?: boolean; password?: string }) => Promise<User>;
  deleteEmployee: (userId: string) => Promise<void>;
  checkSlaEscalations: () => Promise<any>;
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
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number>(0);
  const [isLoadingTickets, setIsLoadingTickets] = useState<boolean>(false);
  const [isLoadingMasterData, setIsLoadingMasterData] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await api.get<any[]>('/notifications?unread_only=true');
      setUnreadNotificationCount(data ? data.length : 0);
    } catch {
      // ignore
    }
  }, [isAuthenticated]);

  const fetchMasterData = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingMasterData(true);
    try {
      const [deptList, catList, subList, empList, ruleList] = await Promise.all([
        api.get<Department[]>('/departments').catch(() => [] as Department[]),
        api.get<Category[]>('/categories').catch(() => [] as Category[]),
        api.get<Subcategory[]>('/subcategories').catch(() => [] as Subcategory[]),
        api.get<User[]>('/users').catch(() => [] as User[]),
        api.get<any[]>('/routing-rules').catch(() => [] as any[]),
      ]);

      setDepartments(deptList || []);
      setCategories(catList || []);
      setSubcategories(subList || []);

      if (empList && empList.length > 0) {
        setEmployees(empList);
      } else if (currentUser) {
        setEmployees(prev => (prev.length === 0 ? [currentUser] : prev));
      }

      // Map routing rules into responsibilities
      if (ruleList && Array.isArray(ruleList)) {
        const mappedResponsibilities: CategoryResponsibility[] = ruleList
          .filter((rule: any) => rule.is_active && rule.assigned_user_id)
          .map((rule: any) => {
            const emp = (empList || []).find((u: any) => u.id === rule.assigned_user_id);
            const cat = (catList || []).find((c: any) => c.id === rule.category_id);
            const sub = (subList || []).find((s: any) => s.id === rule.subcategory_id);
            const dept = (deptList || []).find(
              (d: any) => d.id === rule.department_id || (cat && d.id === cat.department_id)
            );

            return {
              id: rule.id,
              department_id: rule.department_id || (dept ? dept.id : ''),
              department_name: dept ? dept.name : '',
              category_id: rule.category_id || '',
              category_name: cat ? cat.name : '',
              subcategory_id: rule.subcategory_id || null,
              subcategory_name: sub ? sub.name : null,
              responsible_employee_id: rule.assigned_user_id,
              responsible_employee_name: emp ? emp.name : 'Assigned Employee',
              responsible_employee_email: emp ? emp.email : '',
              updated_at: rule.updated_at || new Date().toISOString(),
            };
          });
        setResponsibilities(mappedResponsibilities);
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
      refreshNotifications();
      const interval = setInterval(refreshNotifications, 25000);
      return () => clearInterval(interval);
    } else {
      setTickets([]);
      setDepartments([]);
      setCategories([]);
      setSubcategories([]);
      setEmployees([]);
      setResponsibilities([]);
      setUnreadNotificationCount(0);
    }
  }, [isAuthenticated, fetchMasterData, fetchTickets, refreshNotifications]);

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
    const updated = await api.put<Ticket>(`/tickets/${ticketId}/reopen`, {
      reason: reason || 'Reopened by employee.',
    });
    setTickets(prev => prev.map(t => (t.id === ticketId ? updated : t)));
    return updated;
  };

  const assignTicket = async (ticketId: string, employeeId: string, employeeName?: string): Promise<void> => {
    try {
      await api.put(`/tickets/${ticketId}/assign`, {
        assigned_to_user_id: employeeId,
      });
      await fetchTickets();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        throw new ApiError(
          404,
          'Backend route PUT /api/tickets/{id}/assign is not implemented in the backend router.'
        );
      }
      throw err;
    }
  };

  const updateCategoryResponsibility = async (
    responsibilityId: string,
    responsibleEmployeeId: string,
    responsibleEmployeeName: string,
    responsibleEmployeeEmail: string,
    categoryDetails?: {
      department_id?: string;
      department_name?: string;
      category_id?: string;
      category_name?: string;
      subcategory_id?: string;
      subcategory_name?: string;
    }
  ): Promise<void> => {
    try {
      const isExistingRule = responsibilities.some(r => r.id === responsibilityId && r.id.length > 20);
      let savedRuleId = responsibilityId;

      if (isExistingRule) {
        await api.put(`/routing-rules/${responsibilityId}`, {
          assigned_user_id: responsibleEmployeeId,
          department_id: categoryDetails?.department_id,
          category_id: categoryDetails?.category_id,
          subcategory_id: categoryDetails?.subcategory_id,
        });
      } else {
        const res = await api.post<any>('/routing-rules', {
          assigned_user_id: responsibleEmployeeId,
          department_id: categoryDetails?.department_id,
          category_id: categoryDetails?.category_id,
          subcategory_id: categoryDetails?.subcategory_id,
          default_priority: 'MEDIUM',
        });
        if (res && res.id) savedRuleId = res.id;
      }

      setResponsibilities(prev => {
        const exists = prev.some(
          r =>
            r.id === responsibilityId ||
            (categoryDetails?.category_id &&
              r.category_id === categoryDetails.category_id &&
              (!categoryDetails?.subcategory_id || r.subcategory_id === categoryDetails.subcategory_id))
        );
        if (exists) {
          return prev.map(r =>
            r.id === responsibilityId ||
            (categoryDetails?.category_id &&
              r.category_id === categoryDetails.category_id &&
              (!categoryDetails?.subcategory_id || r.subcategory_id === categoryDetails.subcategory_id))
              ? {
                  ...r,
                  id: savedRuleId,
                  responsible_employee_id: responsibleEmployeeId,
                  responsible_employee_name: responsibleEmployeeName,
                  responsible_employee_email: responsibleEmployeeEmail,
                  ...(categoryDetails?.department_id && { department_id: categoryDetails.department_id }),
                  ...(categoryDetails?.department_name && { department_name: categoryDetails.department_name }),
                  ...(categoryDetails?.category_id && { category_id: categoryDetails.category_id }),
                  ...(categoryDetails?.category_name && { category_name: categoryDetails.category_name }),
                  ...(categoryDetails?.subcategory_id && { subcategory_id: categoryDetails.subcategory_id }),
                  ...(categoryDetails?.subcategory_name && { subcategory_name: categoryDetails.subcategory_name }),
                  updated_at: new Date().toISOString(),
                }
              : r
          );
        }
        return [
          ...prev,
          {
            id: savedRuleId,
            department_id: categoryDetails?.department_id || '',
            department_name: categoryDetails?.department_name || '',
            category_id: categoryDetails?.category_id || '',
            category_name: categoryDetails?.category_name || '',
            subcategory_id: categoryDetails?.subcategory_id || null,
            subcategory_name: categoryDetails?.subcategory_name || null,
            responsible_employee_id: responsibleEmployeeId,
            responsible_employee_name: responsibleEmployeeName,
            responsible_employee_email: responsibleEmployeeEmail,
            updated_at: new Date().toISOString(),
          },
        ];
      });
    } catch (err) {
      console.error('Failed to update category responsibility:', err);
    }
  };

  const removeCategoryResponsibility = async (responsibilityId: string): Promise<void> => {
    try {
      if (responsibilityId && responsibilityId.length > 20) {
        await api.delete(`/routing-rules/${responsibilityId}`).catch(() => {});
      }
    } finally {
      setResponsibilities(prev =>
        prev.filter(r => r.id !== responsibilityId && r.category_id !== responsibilityId)
      );
    }
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

  const createDepartment = async (data: { name: string; department_email?: string }): Promise<Department> => {
    const created = await api.post<Department>('/departments', data);
    setDepartments(prev => [...prev, created]);
    return created;
  };

  const updateDepartment = async (
    deptId: string,
    data: { name?: string; department_email?: string; is_active?: boolean }
  ): Promise<Department> => {
    const updated = await api.put<Department>(`/departments/${deptId}`, data);
    setDepartments(prev => prev.map(d => (d.id === deptId ? updated : d)));
    return updated;
  };

  const deleteDepartment = async (deptId: string): Promise<void> => {
    await api.delete(`/departments/${deptId}`);
    setDepartments(prev => prev.filter(d => d.id !== deptId));
  };

  const createSubcategory = async (data: {
    category_id: string;
    name: string;
    description?: string;
  }): Promise<Subcategory> => {
    const created = await api.post<Subcategory>('/subcategories', data);
    setSubcategories(prev => [...prev, created]);
    return created;
  };

  const updateSubcategory = async (
    subcatId: string,
    data: { name?: string; description?: string; category_id?: string; is_active?: boolean }
  ): Promise<Subcategory> => {
    const updated = await api.put<Subcategory>(`/subcategories/${subcatId}`, data);
    setSubcategories(prev => prev.map(s => (s.id === subcatId ? updated : s)));
    return updated;
  };

  const deleteSubcategory = async (subcatId: string): Promise<void> => {
    await api.delete(`/subcategories/${subcatId}`);
    setSubcategories(prev => prev.filter(s => s.id !== subcatId));
  };

  const createEmployee = async (data: {
    employee_id: string;
    name: string;
    email: string;
    password?: string;
    role?: string;
    department_id?: string;
  }): Promise<User> => {
    const created = await api.post<User>('/users', data);
    setEmployees(prev => [created, ...prev]);
    return created;
  };

  const updateEmployee = async (
    userId: string,
    data: {
      name?: string;
      email?: string;
      employee_id?: string;
      role?: string;
      department_id?: string;
      is_active?: boolean;
      password?: string;
    }
  ): Promise<User> => {
    const updated = await api.put<User>(`/users/${userId}`, data);
    setEmployees(prev => prev.map(e => (e.id === userId ? updated : e)));
    return updated;
  };

  const deleteEmployee = async (userId: string): Promise<void> => {
    await api.delete(`/users/${userId}`);
    setEmployees(prev => prev.filter(e => e.id !== userId));
  };

  const checkSlaEscalations = async (): Promise<any> => {
    return await api.post('/sla-policies/check-escalations');
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
        unreadNotificationCount,
        isLoadingTickets,
        isLoadingMasterData,
        error,
        fetchTickets,
        fetchMasterData,
        refreshNotifications,
        getTicketById,
        createTicket,
        updateTicketStatus,
        resolveTicket,
        closeTicket,
        reopenTicket,
        assignTicket,
        updateCategoryResponsibility,
        removeCategoryResponsibility,
        getComments,
        addComment,
        getAttachments,
        uploadAttachment,
        downloadAttachment,
        getCategoriesByDepartment,
        getSubcategoriesByCategory,
        createDepartment,
        updateDepartment,
        deleteDepartment,
        createSubcategory,
        updateSubcategory,
        deleteSubcategory,
        createEmployee,
        updateEmployee,
        deleteEmployee,
        checkSlaEscalations,
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
