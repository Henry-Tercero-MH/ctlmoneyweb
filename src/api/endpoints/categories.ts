import { callApi } from '../appsScript';
import type { CategoryDTO, CategoryKind } from '../types';

export interface UpsertCategoryPayload {
  id: string;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  parent_id?: string;
  sort_order: number;
}

export const categoriesApi = {
  list: () => callApi<CategoryDTO[]>('listCategories', {}),
  create: (payload: UpsertCategoryPayload, idempotencyId: string) =>
    callApi<CategoryDTO>('createCategory', payload, { idempotencyId }),
  update: (payload: UpsertCategoryPayload, idempotencyId: string) =>
    callApi<CategoryDTO>('updateCategory', payload, { idempotencyId }),
  remove: (id: string, idempotencyId: string) =>
    callApi<{ id: string }>('deleteCategory', { id }, { idempotencyId }),
};
