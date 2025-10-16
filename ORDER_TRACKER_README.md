# Simple Order Tracker Component

This is a super simple real-time order tracking component using ethers.js for your Next.js crypto exchange app.

## What it does

- **Multi-Wallet Support**: Works with MetaMask, Coinbase Wallet, Trust Wallet, and any Wagmi/RainbowKit connector
- Listens for smart contract events: `OrderInitiated` and `OrderSettled`
- Shows orders in real-time with status badges
- Uses Wagmi's `useAccount` hook for wallet connection

## Setup

1. **Environment Variable**: Add to `.env.local`

   ```env
   NEXT_PUBLIC_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890

   # Optional: Your own Alchemy API key for better performance
   NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key_here
   ```

2. **Smart Contract Events** (your contract must emit):

   ```solidity
   event OrderInitiated(address indexed user, uint256 orderId, uint256 amount);
   event OrderSettled(address indexed user, uint256 orderId, bool success);
   ```

## Usage

```tsx
import { OrderTracker } from "@/components/dashboard/order-tracker";

export default function Dashboard() {
  return (
    <div>
      {/* Your other components */}
      <OrderTracker />
    </div>
  );
}
```

## Ethers.js Integration

The key ethers.js parts (works with any wallet):

```tsx
// Get current wallet connection
const { address, isConnected, connector } = useAccount();

// Get provider from any connected wallet (MetaMask, Coinbase, etc.)
const provider = await connector.getProvider();
const ethersProvider = new ethers.BrowserProvider(provider);

// Create contract instance
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, ethersProvider);

// Listen for events
contract.on('OrderInitiated', (user, orderId, amount) => {
  // Handle order started
});

contract.on('OrderSettled', (user, orderId, success) => {
  // Handle order completed/failed
});
```

## Features

- ✅ **Multi-Wallet Support**: MetaMask, Coinbase Wallet, Trust Wallet, WalletConnect, and more
- ✅ Real-time event listening
- ✅ Filters events by user address
- ✅ Simple status tracking (processing → settled/failed)
- ✅ Toast notifications
- ✅ Clean event listener cleanup
- ✅ Uses Wagmi/RainbowKit integration

## RPC Node Options

**Do you need Alchemy or another RPC node?**

- **NO, you don't need one!** The component uses MetaMask's built-in RPC connection by default
- **Optional:** You can use your own Alchemy API key for better performance and reliability

**Current setup:** Uses `BrowserProvider(window.ethereum)` - MetaMask handles the blockchain connection for you.

**For better performance:** Uncomment the Alchemy option in the code and add your API key to `.env.local`.

## That's it

Super simple and works with ethers.js out of the box.
