import { FaqItem } from '../types';
import { MOCK_FAQS } from '../mock/mockData';

const FAQ_STORAGE_KEY = 'resolvehub_faqs';

export const getFaqs = (): FaqItem[] => {
  const stored = localStorage.getItem(FAQ_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(FAQ_STORAGE_KEY, JSON.stringify(MOCK_FAQS));
    return MOCK_FAQS;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return MOCK_FAQS;
  }
};

export const saveFaqs = (faqs: FaqItem[]) => {
  localStorage.setItem(FAQ_STORAGE_KEY, JSON.stringify(faqs));
};

export const addFaq = (newFaq: Omit<FaqItem, 'id' | 'views' | 'helpful_count'>): FaqItem[] => {
  const faqs = getFaqs();
  const created: FaqItem = {
    ...newFaq,
    id: `faq-${Date.now()}`,
    views: 0,
    helpful_count: 0,
  };
  const updated = [created, ...faqs];
  saveFaqs(updated);
  return updated;
};

export const updateFaq = (id: string, updatedFields: Partial<FaqItem>): FaqItem[] => {
  const faqs = getFaqs();
  const updated = faqs.map(f => (f.id === id ? { ...f, ...updatedFields } : f));
  saveFaqs(updated);
  return updated;
};

export const deleteFaq = (id: string): FaqItem[] => {
  const faqs = getFaqs();
  const updated = faqs.filter(f => f.id !== id);
  saveFaqs(updated);
  return updated;
};

export const voteFaq = (id: string): { faqs: FaqItem[]; is_voted: boolean; helpful_count: number } => {
  const faqs = getFaqs();
  let is_voted = false;
  let helpful_count = 0;
  const updated = faqs.map(f => {
    if (f.id === id) {
      const nextVoted = !f.is_voted;
      is_voted = nextVoted;
      helpful_count = Math.max(0, (f.helpful_count || 0) + (nextVoted ? 1 : -1));
      return {
        ...f,
        is_voted: nextVoted,
        helpful_count,
      };
    }
    return f;
  });
  saveFaqs(updated);
  return { faqs: updated, is_voted, helpful_count };
};

export const incrementFaqView = (id: string): FaqItem[] => {
  const faqs = getFaqs();
  const updated = faqs.map(f => (f.id === id ? { ...f, views: (f.views || 0) + 1 } : f));
  saveFaqs(updated);
  return updated;
};
