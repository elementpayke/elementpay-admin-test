"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ELEMENTPAY_CONFIG } from "@/lib/elementpay-config";

// Simple contract ABI
const CONTRACT_ABI = [
  "event OrderInitiated(address indexed user, uint256 orderId, uint256 amount)",
  "event OrderSettled(address indexed user, uint256 orderId, bool success)",
];

// Contract address from env
const CONTRACT_ADDRESS =
  ELEMENTPAY_CONFIG.getCurrentEnvironment() === "sandbox"
    ? process.env.NEXT_PRIVATE_ELEMENTPAY_CONTRACT_ADDRESS_SANDBOX
    : process.env.NEXT_PRIVATE_ELEMENTPAY_CONTRACT_ADDRESS_LIVE;

interface Order {
  orderId: string;
  status: "processing" | "settled" | "failed";
  amount: string;
}

export function OrderTracker() {
  const { address, isConnected, connector } = useAccount();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!isConnected || !address || !connector) return;

    // Create ethers provider for any connected wallet
    const getProvider = async () => {
      try {
        // Get the provider from the connector
        const provider = await connector.getProvider();
        return new ethers.BrowserProvider(provider as any);
      } catch (error) {
        console.error("Failed to get provider from connector:", error);
        throw error;
      }
    };

    const setupEventListeners = async () => {
      try {
        const provider = await getProvider();
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS!,
          CONTRACT_ABI,
          provider
        );

        // Listen for OrderInitiated events
        const handleOrderInitiated = (
          user: string,
          orderId: bigint,
          amount: bigint
        ) => {
          if (user.toLowerCase() === address!.toLowerCase()) {
            const newOrder: Order = {
              orderId: orderId.toString(),
              status: "processing",
              amount: ethers.formatEther(amount),
            };
            setOrders((prev) => [newOrder, ...prev]);
            toast({
              title: "Order Started",
              description: `Order ${orderId.toString()} initiated`,
            });
          }
        };

        // Listen for OrderSettled events
        const handleOrderSettled = (
          user: string,
          orderId: bigint,
          success: boolean
        ) => {
          if (user.toLowerCase() === address!.toLowerCase()) {
            setOrders((prev) =>
              prev.map((order) =>
                order.orderId === orderId.toString()
                  ? { ...order, status: success ? "settled" : "failed" }
                  : order
              )
            );
            toast({
              title: success ? "Order Completed" : "Order Failed",
              description: `Order ${orderId.toString()} ${
                success ? "settled" : "failed"
              }`,
            });
          }
        };

        // Start listening
        contract.on("OrderInitiated", handleOrderInitiated);
        contract.on("OrderSettled", handleOrderSettled);

        // Return cleanup function
        return () => {
          contract.off("OrderInitiated", handleOrderInitiated);
          contract.off("OrderSettled", handleOrderSettled);
        };
      } catch (error) {
        console.error("Failed to setup event listeners:", error);
      }
    };

    // Setup listeners and store cleanup function
    let cleanup: (() => void) | undefined;
    setupEventListeners().then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    // Return cleanup function
    return () => {
      if (cleanup) cleanup();
    };
  }, [isConnected, address, connector, toast]);

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Connect your wallet to track orders</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Tracker</CardTitle>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <p>No orders yet</p>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => (
              <div
                key={order.orderId}
                className="flex justify-between items-center p-2 border rounded"
              >
                <div>
                  <span className="font-medium">Order #{order.orderId}</span>
                  <div className="text-sm text-gray-600">
                    {order.amount} tokens
                  </div>
                </div>
                <Badge
                  variant={
                    order.status === "settled"
                      ? "default"
                      : order.status === "failed"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {order.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
