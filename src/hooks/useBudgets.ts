import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuid } from 'uuid';
import { budgetsApi } from '@/api/endpoints/budgets';
import { toast } from '@/ui/components/toast';
import { t } from '@/i18n/es';

const KEY = ['budgets'] as const;

export function useBudgets() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => budgetsApi.list(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof budgetsApi.create>[0]) =>
      budgetsApi.create(payload, uuid()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      toast.success(t.common.saved);
    },
    onError: () => toast.error(t.common.saveError),
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof budgetsApi.update>[0]) =>
      budgetsApi.update(payload, uuid()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      toast.success(t.common.saved);
    },
    onError: () => toast.error(t.common.saveError),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => budgetsApi.remove(id, uuid()),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
    onError: () => toast.error(t.common.saveError),
  });
}
