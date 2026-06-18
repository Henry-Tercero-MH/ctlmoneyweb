import { callApi } from '../appsScript';

export interface ExportJsonResult {
  exported_at: string;
  version: number;
  data: Record<string, unknown[]>;
}

export interface ExportCsvResult {
  exported_at: string;
  sheets: Record<string, string>;
}

export const exportApi = {
  json: () => callApi<ExportJsonResult>('exportData', { format: 'json' }),
  csv: () => callApi<ExportCsvResult>('exportData', { format: 'csv' }),
};
