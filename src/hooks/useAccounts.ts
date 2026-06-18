import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuid } from 'uuid';
import { accountsApi } from '@/api/endpoints/accounts';
import type { UpsertAccountPayload } from '@/api/endpoints/accounts';
import { toast } from '@/ui/components/toast';
import { t } from '@/i18n/es';
import { QK } from '@/core/constants';

export function useAccounts() {
  return useQuery({ queryKey: QK.accounts(), queryFn: accountsApi.list });
}

export function useAccountBalances() {
  return useQuery({ queryKey: QK.accountBalances(), queryFn: accountsApi.balances });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertAccountPayload) => accountsApi.create(payload, uuid()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.accounts() });
      void qc.invalidateQueries({ queryKey: QK.accountBalances() });
      toast.success(t.common.saved);
    },
    onError: () => toast.error(t.common.saveError),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertAccountPayload) => accountsApi.update(payload, uuid()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.accounts() });
      void qc.invalidateQueries({ queryKey: QK.accountBalances() });
      toast.success(t.common.saved);
    },
    onError: () => toast.error(t.common.saveError),
  });
}

export function useArchiveAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => accountsApi.archive(id, uuid()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.accounts() });
      void qc.invalidateQueries({ queryKey: QK.accountBalances() });
      toast.success(t.common.deleted);
    },
    onError: () => toast.error(t.common.saveError),
  });
}
