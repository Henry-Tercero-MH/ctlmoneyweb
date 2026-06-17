import { useQuery } from '@tanstack/react-query';
import { accountsApi } from '@/api/endpoints/accounts';
import { QK } from '@/core/constants';

export function useAccounts() {
  return useQuery({ queryKey: QK.accounts(), queryFn: accountsApi.list });
}

export function useAccountBalances() {
  return useQuery({ queryKey: QK.accountBalances(), queryFn: accountsApi.balances });
}
