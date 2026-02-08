import type { DecisionRecord } from './types';

const STORAGE_KEY = 'olm_history_v1';

let memoryStore: DecisionRecord[] = [];

const canUseLocalStorage = () => {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage);
  } catch {
    return false;
  }
};

export const migrateIfNeeded = (): DecisionRecord[] => {
  return loadHistory();
};

export const loadHistory = (): DecisionRecord[] => {
  if (!canUseLocalStorage()) return memoryStore;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as DecisionRecord[];
  } catch {
    return [];
  }
};

export const saveHistory = (items: DecisionRecord[]) => {
  if (!canUseLocalStorage()) {
    memoryStore = items;
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    memoryStore = items;
  }
};

const trimToLimit = (items: DecisionRecord[]) => items.slice(0, 20);

export const addRecord = (record: DecisionRecord): DecisionRecord[] => {
  const items = trimToLimit([record, ...loadHistory()]);
  saveHistory(items);
  return items;
};

export const updateRecord = (id: string, patch: Partial<DecisionRecord>): DecisionRecord[] => {
  const items = loadHistory().map((item) => (item.id === id ? { ...item, ...patch } : item));
  saveHistory(items);
  return items;
};

export const deleteRecord = (id: string): DecisionRecord[] => {
  const items = loadHistory().filter((item) => item.id !== id);
  saveHistory(items);
  return items;
};

export const clearHistory = () => {
  saveHistory([]);
};
