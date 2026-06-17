import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '@/api/endpoints/categories';
import { QK } from '@/core/constants';

export function useCategories() {
  return useQuery({
    queryKey: QK.categories(),
    queryFn: categoriesApi.list,
  });
}
