import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { installmentsApi } from '@/api/endpoints/installments';
import { QK } from '@/core/constants';
import { toast } from '@/ui/components/toast';
import { t } from '@/i18n/es';
import type { CreateInstallmentPayload, UpdateInstallmentPayload } from '@/api/types';
import { v4 as uuid } from 'uuid';

export function useInstallments() {
  return useQuery({
    queryKey: QK.installments(),
    queryFn: () => installmentsApi.list(),
  });
}

export function useCreateInstallment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateInstallmentPayload) =>
      installmentsApi.create(payload, `${payload.id}-create`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.installments() });
      toast.success(t.common.saved);
    },
    onError: () => toast.error(t.common.saveError),
  });
}

export function useUpdateInstallment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateInstallmentPayload) =>
      installmentsApi.update(payload, `${payload.id}-${uuid()}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.installments() });
      toast.success(t.common.saved);
    },
    onError: () => toast.error(t.common.saveError),
  });
}

export function useDeleteInstallment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => installmentsApi.remove(id, `${id}-del-${uuid()}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.installments() });
      toast.success(t.common.deleted);
    },
    onError: () => toast.error(t.common.saveError),
  });
}
