import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/api/endpoints/settings';
import { QK } from '@/core/constants';
import { toast } from '@/ui/components/toast';
import { t } from '@/i18n/es';

export function useSettings() {
  return useQuery({
    queryKey: QK.settings(),
    queryFn: settingsApi.getAll,
  });
}

export function useSetSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      settingsApi.set(key, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.settings() });
    },
    onError: () => toast.error(t.common.saveError),
  });
}
