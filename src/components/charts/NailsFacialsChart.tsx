"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { NailsFacialsTrendPoint } from "@/lib/reports";
import { formatCurrency } from "@/lib/utils";

export function NailsFacialsChart({ data }: { data: NailsFacialsTrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fill: "#6b5847", fontSize: 12, fontWeight: 600 }}
          axisLine={{ stroke: "#eeddc7" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#6b5847", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip
          formatter={(value) => formatCurrency(Number(value))}
          contentStyle={{
            background: "#ffffff",
            border: "1px solid #eeddc7",
            borderRadius: 12,
            fontSize: 13,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
        <Bar dataKey="nailsAmount" name="💅 ציפורניים" fill="#c2477e" radius={[6, 6, 0, 0]} />
        <Bar dataKey="facialsAmount" name="✨ טיפולי פנים" fill="#dd7a3a" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
