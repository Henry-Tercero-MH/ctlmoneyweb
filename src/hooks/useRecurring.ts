import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuid } from 'uuid';
import { recurringApi } from '@/api/endpoints/recurring';
import { toast } from '@/ui/components/toast';
import { t } from '@/i18n/es';

const KEY = ['recurring'] as const;

export function useRecurringRules() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => recurringApi.list(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof recurringApi.create>[0]) =>
      recurringApi.create(payload, uuid()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      toast.success(t.common.saved);
    },
    onError: () => toast.error(t.common.saveError),
  });
}

export function useUpdateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof recurringApi.update>[0]) =>
      recurringApi.update(payload, uuid()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      toast.success(t.common.saved);
    },
    onError: () => toast.error(t.common.saveError),
  });
}

export function useDeleteRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recurringApi.remove(id, uuid()),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
    onError: () => toast.error(t.common.saveError),
  });
}
