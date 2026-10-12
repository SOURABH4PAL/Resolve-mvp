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

export const deleteFaq = (id: string): FaqItem[] => {
  const faqs = getFaqs();
  const updated = faqs.filter(f => f.id !== id);
  saveFaqs(updated);
  return updated;
};
