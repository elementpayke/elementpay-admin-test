import { useBalance, useChainId, useAccount } from "wagmi";
import type { ElementPayToken, WalletBalance } from "@/lib/types";

interface UseTokenBalanceProps {
  token: ElementPayToken;
  enabled?: boolean;
}

export const useTokenBalance = ({ token, enabled = true }: UseTokenBalanceProps) => {
  const { address } = useAccount();
  const currentChainId = useChainId();
  
  const isCorrectNetwork = currentChainId === token.chainId;
  
  const { data: tokenBalanceData, isLoading, error, refetch } = useBalance({
    address: address,
    token: token.tokenAddress as `0x${string}`,
    chainId: token.chainId,
    query: {
      enabled: enabled && isCorrectNetwork && !!address,
      staleTime: 30_000,
      refetchInterval: 30_000,
      retry: (failureCount, error: any) => {
        if (error?.code === -32005) return false; 
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  });

  const tokenBalance = parseFloat(tokenBalanceData?.formatted || "0");
  
  return {
    balance: tokenBalance,
    formattedBalance: tokenBalanceData?.formatted || "0",
    isLoading,
    error,
    refetch,
    isCorrectNetwork,
    requiredChainId: token.chainId,
    currentChainId
  };
};

/**
 * Hook to get balances for multiple tokens
 */
export const useMultipleTokenBalances = (tokens: ElementPayToken[], enabled = true) => {
  const { address } = useAccount();
  const currentChainId = useChainId();
  
  const balances: WalletBalance[] = [];
  const isLoading = false;
  const errors: any[] = [];
  
  // Use individual token balance hooks
  const tokenBalances = tokens.map(token => 
    useTokenBalance({ token, enabled: enabled && !!address })
  );
  
  // Combine results
  tokens.forEach((token, index) => {
    const tokenBalance = tokenBalances[index];
    balances.push({
      token,
      balance: tokenBalance.balance,
      formattedBalance: tokenBalance.formattedBalance
    });
    
    if (tokenBalance.error) {
      errors.push({ token: token.symbol, error: tokenBalance.error });
    }
  });
  
  const anyLoading = tokenBalances.some(tb => tb.isLoading);
  
  return {
    balances,
    isLoading: anyLoading,
    errors,
    refetchAll: () => {
      tokenBalances.forEach(tb => tb.refetch());
    }
  };
};
