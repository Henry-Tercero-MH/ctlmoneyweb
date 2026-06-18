import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuid } from 'uuid';
import { goalsApi } from '@/api/endpoints/goals';
import type { UpsertGoalPayload } from '@/api/endpoints/goals';
import { toast } from '@/ui/components/toast';
import { t } from '@/i18n/es';
import { QK } from '@/core/constants';

export function useGoals() {
  return useQuery({ queryKey: QK.goals(), queryFn: goalsApi.list });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertGoalPayload) => goalsApi.create(payload, uuid()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.goals() });
      toast.success(t.common.saved);
    },
    onError: () => toast.error(t.common.saveError),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertGoalPayload) => goalsApi.update(payload, uuid()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.goals() });
      toast.success(t.common.saved);
    },
    onError: () => toast.error(t.common.saveError),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => goalsApi.remove(id, uuid()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.goals() });
      void qc.invalidateQueries({ queryKey: QK.goalContributions() });
      toast.success(t.common.deleted);
    },
    onError: () => toast.error(t.common.saveError),
  });
}

export function useGoalContributions() {
  return useQuery({ queryKey: QK.goalContributions(), queryFn: goalsApi.listContributions });
}

export function useAddContribution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof goalsApi.addContribution>[0]) =>
      goalsApi.addContribution(payload, uuid()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.goalContributions() });
      toast.success(t.common.saved);
    },
    onError: () => toast.error(t.common.saveError),
  });
}

export function useDeleteContribution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => goalsApi.removeContribution(id, uuid()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.goalContributions() });
      toast.success(t.common.deleted);
    },
    onError: () => toast.error(t.common.saveError),
  });
}
