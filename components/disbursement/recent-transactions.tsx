"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface DisbursementOrder {
  id: string;
  kesAmount: number;
  status: string;
  created_at: string;
}

interface RecentTransactionsProps {
  recentDisbursements: DisbursementOrder[];
}

export default function RecentTransactions({
  recentDisbursements,
}: RecentTransactionsProps) {
  if (recentDisbursements.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-xl flex items-center space-x-2">
          <Clock className="h-4 w-4" />
          <span>Recent Transactions</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {recentDisbursements.slice(0, 5).map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-2.5 bg-muted/30 rounded-md border hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium">
                  KES {transaction.kesAmount.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(transaction.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <Badge
                variant={
                  transaction.status === "COMPLETED"
                    ? "default"
                    : transaction.status === "PENDING"
                    ? "secondary"
                    : "destructive"
                }
                className="text-xs"
              >
                {transaction.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
