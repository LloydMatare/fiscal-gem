"use client";

import { Pie, PieChart, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatusCount {
  status: string;
  count: number;
}

const STATUS_COLORS: Record<string, string> = {
  FISCALISED: "#22c55e",
  ACCEPTED: "#3b82f6",
  FAILED: "#ef4444",
  PENDING: "#f59e0b",
  RECEIVED: "#a855f7",
  PROCESSING: "#6366f1",
  SENT: "#06b6d4",
  VALIDATED: "#8b5cf6",
  QUEUED: "#ec4899",
  CANCELLED: "#64748b",
  default: "#71717a",
};

function getColor(status: string) {
  return STATUS_COLORS[status] || STATUS_COLORS.default;
}

export function StatusChart({ data }: { data: StatusCount[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Receipt Status Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No receipt data yet
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                dataKey="count"
                nameKey="status"
                paddingAngle={2}
              >
                {data.map((entry) => (
                  <Cell key={entry.status} fill={getColor(entry.status)} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span className="text-xs">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
