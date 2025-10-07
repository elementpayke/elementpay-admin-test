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
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="h-5 w-5" />
          <span>Recent Transactions</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {recentDisbursements.slice(0, 5).map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div>
                <p className="font-medium">
                  KES {transaction.kesAmount.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  {new Date(transaction.created_at).toLocaleDateString()}
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
