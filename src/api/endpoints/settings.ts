import { callApi } from '../appsScript';

export const settingsApi = {
  getAll: () => callApi<Record<string, string>>('getAllSettings', {}),
  set: (key: string, value: string) => callApi<{ key: string }>('setSetting', { key, value }),
  initialize: () => callApi<{ created: string[] }>('initializeSpreadsheet', {}),
};
