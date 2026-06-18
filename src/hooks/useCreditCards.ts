import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuid } from 'uuid';
import { creditCardsApi } from '@/api/endpoints/creditCards';
import type { CreditCard } from '@/core/creditCard';
import { QK } from '@/core/constants';
import { toast } from '@/ui/components/toast';
import { t } from '@/i18n/es';

export function useCreditCards() {
  return useQuery({ queryKey: QK.creditCards(), queryFn: creditCardsApi.list });
}

export function useUpsertCreditCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ card, isEdit }: { card: CreditCard; isEdit: boolean }) =>
      isEdit ? creditCardsApi.update(card, uuid()) : creditCardsApi.create(card, uuid()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.creditCards() });
      toast.success(t.common.saved);
    },
    onError: () => toast.error(t.common.saveError),
  });
}

export function useDeleteCreditCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => creditCardsApi.remove(id, uuid()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.creditCards() });
      toast.success(t.common.deleted);
    },
    onError: () => toast.error(t.common.saveError),
  });
}
