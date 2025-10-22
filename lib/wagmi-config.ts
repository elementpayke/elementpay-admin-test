import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base, mainnet, sepolia, arbitrum, scroll, arbitrumSepolia, baseSepolia, scrollSepolia } from "wagmi/chains";
import { http, webSocket } from "wagmi";

// Define Lisk chain since it's not in wagmi/chains
const lisk = {
  id: 1135,
  name: 'Lisk',
  network: 'lisk',
  nativeCurrency: {
    decimals: 18,
    name: 'Lisk',
    symbol: 'LSK',
  },
  rpcUrls: {
    public: { http: ['https://rpc.api.lisk.com'] },
    default: { http: ['https://rpc.api.lisk.com'] },
  },
  webSockets: {
    default: { webSocket: ['wss://ws.api.lisk.com'] },
  },
  blockExplorers: {
    default: { name: 'Lisk Explorer', url: 'https://blockscout.lisk.com' },
  },
} as const;

// Define Lisk Sepolia testnet
const liskSepolia = {
  id: 4202,
  name: 'Lisk Sepolia',
  network: 'lisk-sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Lisk',
    symbol: 'LSK',
  },
  rpcUrls: {
    public: { http: ['https://rpc.sepolia-api.lisk.com'] },
    default: { http: ['https://rpc.sepolia-api.lisk.com'] },
  },
  webSockets: {
    default: { webSocket: ['wss://ws.sepolia-api.lisk.com'] },
  },
  blockExplorers: {
    default: { name: 'Lisk Sepolia Explorer', url: 'https://sepolia-blockscout.lisk.com' },
  },
  testnet: true,
} as const;

export const config = getDefaultConfig({
  appName: "Element Pay Dashboard",
  projectId:
    process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "demo-project-id",
  chains: [
    // Mainnet chains
    base, mainnet, arbitrum, scroll, lisk,
    // Testnet chains
    sepolia, arbitrumSepolia, baseSepolia, scrollSepolia, liskSepolia
  ],
  transports: {
    // Use WebSocket for supported chains, fallback to HTTP
    [base.id]: webSocket("wss://base-mainnet.g.alchemy.com/v2/demo"),
    [mainnet.id]: webSocket("wss://eth-mainnet.g.alchemy.com/v2/demo"),
    [sepolia.id]: webSocket("wss://eth-sepolia.g.alchemy.com/v2/demo"),
    [arbitrum.id]: webSocket("wss://arb-mainnet.g.alchemy.com/v2/demo"),
    [arbitrumSepolia.id]: webSocket("wss://arb-sepolia.g.alchemy.com/v2/demo"),
    [baseSepolia.id]: webSocket("wss://base-sepolia.g.alchemy.com/v2/demo"),
    [scroll.id]: http(),
    [scrollSepolia.id]: http(),
    [lisk.id]: http(), // Lisk doesn't have WebSocket support yet
    [liskSepolia.id]: http(), // Lisk Sepolia doesn't have WebSocket support yet
  },
  ssr: true,
});
