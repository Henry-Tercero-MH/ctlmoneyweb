import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuid } from 'uuid';
import { categoriesApi } from '@/api/endpoints/categories';
import type { UpsertCategoryPayload } from '@/api/endpoints/categories';
import { toast } from '@/ui/components/toast';
import { t } from '@/i18n/es';
import { QK } from '@/core/constants';

export function useCategories() {
  return useQuery({
    queryKey: QK.categories(),
    queryFn: categoriesApi.list,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertCategoryPayload) => categoriesApi.create(payload, uuid()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.categories() });
      toast.success(t.common.saved);
    },
    onError: () => toast.error(t.common.saveError),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertCategoryPayload) => categoriesApi.update(payload, uuid()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.categories() });
      toast.success(t.common.saved);
    },
    onError: () => toast.error(t.common.saveError),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id, uuid()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.categories() });
      toast.success(t.common.deleted);
    },
    onError: () => toast.error(t.common.saveError),
  });
}
