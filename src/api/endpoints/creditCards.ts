import { callApi } from '../appsScript';
import type { CreditCardDTO, UpsertCreditCardPayload } from '../types';
import type { CreditCard } from '@/core/creditCard';

function fromDTO(d: CreditCardDTO): CreditCard {
  return {
    id: d.id,
    name: d.name,
    cutoffDay: Number(d.cutoff_day) || 1,
    paymentDay: Number(d.payment_day) || 1,
    limitMinor: Number(d.limit_minor) || 0,
    currency: d.currency || 'GTQ',
    linkedAccountId: d.linked_account_id || '',
  };
}

function toPayload(c: CreditCard): UpsertCreditCardPayload {
  return {
    id: c.id,
    name: c.name,
    cutoff_day: c.cutoffDay,
    payment_day: c.paymentDay,
    limit_minor: c.limitMinor,
    currency: c.currency,
    linked_account_id: c.linkedAccountId,
  };
}

export const creditCardsApi = {
  list: async (): Promise<CreditCard[]> => {
    const rows = await callApi<CreditCardDTO[]>('listCreditCards', {});
    return rows.map(fromDTO);
  },
  create: (card: CreditCard, idempotencyId: string) =>
    callApi<CreditCardDTO>('createCreditCard', toPayload(card), { idempotencyId }),
  update: (card: CreditCard, idempotencyId: string) =>
    callApi<CreditCardDTO>('updateCreditCard', toPayload(card), { idempotencyId }),
  remove: (id: string, idempotencyId: string) =>
    callApi<{ id: string }>('deleteCreditCard', { id }, { idempotencyId }),
};
