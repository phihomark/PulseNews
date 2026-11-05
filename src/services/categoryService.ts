export const DEFAULT_CATEGORIES = [
  'World News',
  'Technology',
  'Cybersecurity',
  'Business',
  'Mobility & EV',
  'Entertainment'
];

const STORAGE_KEY = 'tintuc_all_categories_v2';

export const getStoredCategories = (): string[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return [...DEFAULT_CATEGORIES];
};

export const saveCategoryList = (categories: string[]): string[] => {
  const cleanList = Array.from(new Set(categories.map(c => c.trim()).filter(Boolean)));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanList));
    window.dispatchEvent(new Event('categories_updated'));
  } catch (err) {
    console.error('Error saving categories:', err);
  }
  return cleanList;
};

export const getAllCategories = (existingArticles: { category: string }[] = []): string[] => {
  const stored = getStoredCategories();
  const articleCategories = existingArticles.map(a => a.category).filter(Boolean);
  return Array.from(new Set([...stored, ...articleCategories]));
};

export const saveCustomCategory = (newCat: string): string => {
  const trimmed = newCat.trim();
  if (!trimmed) return '';
  
  const current = getStoredCategories();
  if (!current.includes(trimmed)) {
    const updated = [...current, trimmed];
    saveCategoryList(updated);
  }
  return trimmed;
};

export const addCategory = (name: string): string[] => {
  const trimmed = name.trim();
  if (!trimmed) return getStoredCategories();
  
  const current = getStoredCategories();
  if (!current.includes(trimmed)) {
    const updated = [...current, trimmed];
    return saveCategoryList(updated);
  }
  return current;
};

export const updateCategory = (oldName: string, newName: string): string[] => {
  const trimmedNew = newName.trim();
  if (!trimmedNew) return getStoredCategories();

  const current = getStoredCategories();
  const index = current.indexOf(oldName);
  if (index !== -1) {
    const updated = [...current];
    updated[index] = trimmedNew;
    return saveCategoryList(updated);
  }
  return current;
};

export const deleteCategory = (categoryName: string): string[] => {
  const current = getStoredCategories();
  const updated = current.filter(c => c !== categoryName);
  return saveCategoryList(updated);
};
