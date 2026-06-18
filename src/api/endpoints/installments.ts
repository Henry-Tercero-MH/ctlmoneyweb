import { callApi } from '../appsScript';
import type { InstallmentDTO, CreateInstallmentPayload, UpdateInstallmentPayload } from '../types';

export const installmentsApi = {
  list: () => callApi<InstallmentDTO[]>('listInstallments', {}),
  create: (payload: CreateInstallmentPayload, idempotencyId: string) =>
    callApi<InstallmentDTO>('createInstallment', payload, { idempotencyId }),
  update: (payload: UpdateInstallmentPayload, idempotencyId: string) =>
    callApi<InstallmentDTO>('updateInstallment', payload, { idempotencyId }),
  remove: (id: string, idempotencyId: string) =>
    callApi<{ id: string }>('deleteInstallment', { id }, { idempotencyId }),
};
