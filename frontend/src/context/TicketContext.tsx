import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Ticket,
  Department,
  Category,
  TicketPriority,
  TicketStatus,
  TicketComment,
  TicketAttachment,
} from '../types';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

interface TicketContextType {
  tickets: Ticket[];
  departments: Department[];
  categories: Category[];
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
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState<boolean>(false);
  const [isLoadingMasterData, setIsLoadingMasterData] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMasterData = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingMasterData(true);
    try {
      const [deptList, catList] = await Promise.all([
        api.get<Department[]>('/departments'),
        api.get<Category[]>('/categories'),
      ]);
      setDepartments(deptList || []);
      setCategories(catList || []);
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
      const ticketList = await api.get<Ticket[]>('/tickets');
      setTickets(ticketList || []);
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
      setDepartments([]);
      setCategories([]);
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
    const newTicket = await api.post<Ticket>('/tickets', data);
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

  const getCategoriesByDepartment = (departmentId: string): Category[] => {
    return categories.filter(c => c.department_id === departmentId && c.is_active);
  };

  return (
    <TicketContext.Provider
      value={{
        tickets,
        departments,
        categories,
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
