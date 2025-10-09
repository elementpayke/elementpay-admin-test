"use client";

import { useState } from "react";
import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { base, mainnet, sepolia, arbitrum, scroll } from "wagmi/chains";

// Define Lisk chain since it's not in wagmi/chains
const lisk = {
  id: 1135,
  name: "Lisk",
  network: "lisk",
  nativeCurrency: {
    decimals: 18,
    name: "Lisk",
    symbol: "LSK",
  },
  rpcUrls: {
    public: { http: ["https://rpc.api.lisk.com"] },
    default: { http: ["https://rpc.api.lisk.com"] },
  },
  blockExplorers: {
    default: { name: "Lisk Explorer", url: "https://blockscout.lisk.com" },
  },
} as const;

const config = getDefaultConfig({
  appName: "Element Pay Dashboard",
  projectId:
    process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "demo-project-id",
  chains: [base, mainnet, sepolia, arbitrum, scroll, lisk],
  ssr: true,
});

export function WagmiProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      })
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
