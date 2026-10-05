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

const performance = [
  { id: "jan-1", month: "Jan", value: 109200 },
  { id: "jan-2", month: "", value: 113800 },
  { id: "jan-3", month: "", value: 108400 },
  { id: "jan-4", month: "", value: 114600 },
  { id: "feb-1", month: "Feb", value: 111200 },
  { id: "feb-2", month: "", value: 117900 },
  { id: "feb-3", month: "", value: 115100 },
  { id: "feb-4", month: "", value: 120400 },
  { id: "mar-1", month: "Mar", value: 125400 },
  { id: "mar-2", month: "", value: 119800 },
  { id: "mar-3", month: "", value: 122600 },
  { id: "mar-4", month: "", value: 118200 },
  { id: "apr-1", month: "Apr", value: 123900 },
  { id: "apr-2", month: "", value: 121100 },
  { id: "apr-3", month: "", value: 126700 },
  { id: "apr-4", month: "", value: 124200 },
  { id: "may-1", month: "May", value: 128800 },
  { id: "may-2", month: "", value: 125600 },
  { id: "may-3", month: "", value: 129900 },
  { id: "may-4", month: "", value: 127400 },
  { id: "jun-1", month: "Jun", value: 131600 },
  { id: "jun-2", month: "", value: 128300 },
  { id: "jun-3", month: "", value: 132400 },
  { id: "jun-4", month: "", value: 130500 },
];

const highlightedPoint = performance.find((point) => point.month === "Mar")!;

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function PortfolioPerformanceChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={performance} margin={{ top: 36, right: 8, left: 8, bottom: 0 }}>
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
          tickFormatter={(id: string) =>
            performance.find((point) => point.id === id)?.month ?? ""
          }
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
          labelFormatter={(id) =>
            performance.find((point) => point.id === id)?.month || "Semana"
          }
          formatter={(value) => [currency.format(Number(value)), "Patrimônio"]}
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
        <MarchCallout />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function MarchCallout() {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  const plot = usePlotArea();

  if (!xScale || !yScale || !plot) {
    return null;
  }

  const x = xScale(highlightedPoint.id);
  const y = yScale(highlightedPoint.value);

  if (x == null || y == null) {
    return null;
  }

  const axisY = plot.y + plot.height;
  const label = "R$ 125.4k";
  const labelWidth = 72;
  const labelHeight = 22;

  return (
    <g>
      <line
        x1={x}
        y1={y}
        x2={x}
        y2={axisY}
        stroke="#71717a"
        strokeWidth={1}
      />
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
      <text
        x={x}
        y={y - 22}
        textAnchor="middle"
        fill="#f4f4f5"
        fontSize={11}
        fontWeight={600}
      >
        {label}
      </text>
    </g>
  );
}
