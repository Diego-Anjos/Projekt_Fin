"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  usePlotArea,
  useXAxisScale,
  useYAxisScale,
} from "recharts";
import type { PerformanceData } from "@/types/dashboard";

type ChartPoint = {
  id: string;
  month: string;
  value: number;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const calloutFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function PortfolioPerformance({ data }: { data: PerformanceData }) {
  const points: ChartPoint[] = data.map((point, index) => ({
    id: String(index),
    month: point.month,
    value: point.value,
  }));
  const highlighted = points.at(-1);

  return (
    <article className="rounded-xl border border-zinc-700/50 bg-black p-4 xl:col-span-2">
      <h3 className="text-sm font-semibold text-zinc-100">Portfolio Performance</h3>
      <div className="mt-4 h-64">
        {highlighted ? (
          <PerformanceChart points={points} highlighted={highlighted} />
        ) : (
          <p className="text-sm text-zinc-400">Sem dados de performance.</p>
        )}
      </div>
    </article>
  );
}

function PerformanceChart({
  points,
  highlighted,
}: {
  points: ChartPoint[];
  highlighted: ChartPoint;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={points} margin={{ top: 36, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.75} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#27272a" />
        <XAxis
          dataKey="id"
          interval={0}
          padding={{ left: 12, right: 12 }}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#a1a1aa", fontSize: 12 }}
          dy={8}
          tickFormatter={(id: string) => points.find((point) => point.id === id)?.month ?? ""}
        />
        <YAxis hide />
        <Tooltip
          cursor={{ stroke: "#3f3f46", strokeWidth: 1 }}
          contentStyle={{
            backgroundColor: "#18181b",
            border: "1px solid #27272a",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "#a1a1aa" }}
          itemStyle={{ color: "#10b981" }}
          labelFormatter={(id) => points.find((point) => point.id === String(id))?.month || "Semana"}
          formatter={(value) => [currencyFormatter.format(Number(value)), "Patrimônio"]}
        />
        <Area
          type="linear"
          dataKey="value"
          stroke="#34d399"
          strokeWidth={2}
          strokeLinejoin="miter"
          fill="url(#portfolioFill)"
          dot={false}
          activeDot={{ r: 3, fill: "#34d399", stroke: "#09090b", strokeWidth: 2 }}
        />
        <ValueCallout point={highlighted} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ValueCallout({ point }: { point: ChartPoint }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  const plot = usePlotArea();

  if (!xScale || !yScale || !plot) {
    return null;
  }

  const x = xScale(point.id);
  const y = yScale(point.value);

  if (x == null || y == null) {
    return null;
  }

  const axisY = plot.y + plot.height;
  const label = `R$ ${calloutFormatter.format(point.value)}`;
  const labelWidth = Math.max(72, label.length * 7);
  const labelHeight = 22;

  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={axisY} stroke="#71717a" strokeWidth={1} />
      <circle cx={x} cy={y} r={5} fill="#34d399" stroke="#ecfdf5" strokeWidth={2} />
      <rect
        x={x - labelWidth / 2}
        y={y - labelHeight - 12}
        width={labelWidth}
        height={labelHeight}
        rx={6}
        fill="#18181b"
        stroke="#27272a"
      />
      <text x={x} y={y - 22} textAnchor="middle" fill="#f4f4f5" fontSize={11} fontWeight={600}>
        {label}
      </text>
    </g>
  );
}
