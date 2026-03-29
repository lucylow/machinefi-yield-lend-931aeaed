import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUsd } from "@/lib/format";
import type { RevenueBySourcePoint } from "@/types/protocol";

interface RevenueBySourceChartProps {
  title?: string;
  data: RevenueBySourcePoint[];
  period: "24h" | "30d";
}

export function RevenueBySourceChart({ title = "Revenue by source", data, period }: RevenueBySourceChartProps) {
  const chartData = data.map((row) => ({
    name: row.label,
    amount: period === "24h" ? row.amountUsd24h : row.amountUsd30d,
  }));

  return (
    <Card className="border-border/60 bg-card/85">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-display">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">Mapped to measurable protocol activity — not ad inventory.</p>
      </CardHeader>
      <CardContent className="h-[280px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={0} angle={-18} textAnchor="end" height={64} />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(v) => formatUsd(v as number, { compact: true })}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number) => [formatUsd(value), "Attributed"]}
            />
            <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Revenue" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
