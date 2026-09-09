import { useState, useEffect, useCallback } from 'react';
import { categoryService } from '../services/categoryService';
import { ProductCategoryRow } from '../types';

interface UseProductCategoriesResult {
  categories: ProductCategoryRow[];
  categoryNames: string[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useProductCategories(): UseProductCategoriesResult {
  const [categories, setCategories] = useState<ProductCategoryRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async (force = false) => {
    setIsLoading(true);
    setError(null);
    const res = await categoryService.getActiveCategories(force);
    if (res.error) {
      setError(res.error);
    } else {
      setCategories(res.data);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const refresh = useCallback(async () => {
    categoryService.invalidateCache();
    await fetchCategories(true);
  }, [fetchCategories]);

  return {
    categories,
    categoryNames: categories.map((c) => c.name),
    isLoading,
    error,
    refresh,
  };
}
