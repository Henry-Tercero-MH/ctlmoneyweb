import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { v4 as uuid } from 'uuid';
import { transactionsApi } from '@/api/endpoints/transactions';
import { QK } from '@/core/constants';
import type { CreateTransactionPayload, TransactionDTO } from '@/api/types';
import { toast } from '@/ui/components/toast';
import { t } from '@/i18n/es';

export function useTransactions(yearMonth: string, search = '') {
  return useQuery({
    queryKey: QK.transactions(yearMonth),
    queryFn: () => transactionsApi.list({ yearMonth }),
    select: (rows) =>
      search
        ? rows.filter((r) => r.note.toLowerCase().includes(search.toLowerCase()))
        : rows,
  });
}

export function useTransactionSummary(yearMonth: string) {
  return useQuery({
    queryKey: QK.transactionSummary(yearMonth),
    queryFn: () => transactionsApi.summary(yearMonth),
  });
}

/** Crea una transacción con optimistic update sobre el caché del mes. */
export function useCreateTransaction(yearMonth: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTransactionPayload) =>
      transactionsApi.create(payload, `${payload.id}-create`),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: QK.transactions(yearMonth) });
      const prev = qc.getQueryData<TransactionDTO[]>(QK.transactions(yearMonth));
      const optimistic: TransactionDTO = {
        ...payload,
        transfer_account_id: payload.transfer_account_id ?? '',
        recurring_id: '',
        idempotency_id: `${payload.id}-create`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      qc.setQueryData<TransactionDTO[]>(QK.transactions(yearMonth), (old) => [
        optimistic,
        ...(old ?? []),
      ]);
      return { prev };
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.transactions(yearMonth), ctx.prev);
      toast.error(t.common.saveError);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QK.transactions(yearMonth) });
      qc.invalidateQueries({ queryKey: QK.transactionSummary(yearMonth) });
      qc.invalidateQueries({ queryKey: QK.accountBalances() });
    },
  });
}

export function useUpdateTransaction(yearMonth: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTransactionPayload) =>
      transactionsApi.update(payload, `${payload.id}-${uuid()}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.transactions(yearMonth) });
      qc.invalidateQueries({ queryKey: QK.transactionSummary(yearMonth) });
      qc.invalidateQueries({ queryKey: QK.accountBalances() });
      toast.success(t.common.saved);
    },
    onError: () => toast.error(t.common.saveError),
  });
}

export function useDeleteTransaction(yearMonth: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => transactionsApi.remove(id, `${id}-del-${uuid()}`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: QK.transactions(yearMonth) });
      const prev = qc.getQueryData<TransactionDTO[]>(QK.transactions(yearMonth));
      qc.setQueryData<TransactionDTO[]>(QK.transactions(yearMonth), (old) =>
        (old ?? []).filter((tx) => tx.id !== id),
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.transactions(yearMonth), ctx.prev);
      toast.error(t.common.saveError);
    },
    onSuccess: () => toast.success(t.common.deleted),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QK.transactionSummary(yearMonth) });
      qc.invalidateQueries({ queryKey: QK.accountBalances() });
    },
  });
}
