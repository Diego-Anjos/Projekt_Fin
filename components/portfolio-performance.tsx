"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MonthlyComparisonPoint } from "@/types/dashboard";

const axisFormatter = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

type ComparisonTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{
    dataKey?: string | number;
    value?: number | string;
  }>;
  label?: string | number;
};

function formatTooltipAmount(value: number | string | undefined) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "0,00";
  return amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function CustomTooltip({ active, payload, label }: ComparisonTooltipProps) {
  if (!active || !payload?.length) return null;

  const gastos = payload.find((item) => item.dataKey === "gastos")?.value;
  const economia = payload.find((item) => item.dataKey === "economia")?.value;

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-[#06140e]/95 p-4 shadow-2xl backdrop-blur-md">
      <p className="mb-2 text-sm font-semibold text-slate-100">{label}</p>
      <p className="text-xs font-medium text-[#10b981]">
        Economia : R$ {formatTooltipAmount(economia)}
      </p>
      <p className="mt-1 text-xs font-medium text-[#f43f5e]">
        Gastos : R$ {formatTooltipAmount(gastos)}
      </p>
    </div>
  );
}

export function PortfolioPerformance({ data }: { data: MonthlyComparisonPoint[] }) {
  return (
    <article className="rounded-xl border border-zinc-700/50 bg-black p-4 xl:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">Gastos vs. Economia</h3>
          <p className="mt-1 text-xs text-zinc-500">Últimos 6 meses</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-red-400" aria-hidden="true" />
            Gastos
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-400" aria-hidden="true" />
            Economia
          </span>
        </div>
      </div>
      <div className="mt-4 h-64">
        {data.length === 0 ? (
          <p className="text-sm text-zinc-400">Sem transações para comparar.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={4}>
              <CartesianGrid vertical={false} stroke="#27272a" />
              <XAxis
                dataKey="mes"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#a1a1aa", fontSize: 12 }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={52}
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
                tickFormatter={(value: number) => axisFormatter.format(value)}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                content={CustomTooltip}
                wrapperStyle={{ outline: "none" }}
              />
              <Bar dataKey="gastos" name="Gastos" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="economia" name="Economia" radius={[4, 4, 0, 0]} maxBarSize={28}>
                {data.map((point, index) => (
                  <Cell key={`${point.mes}-${index}`} fill={point.economia < 0 ? "#fb7185" : "#34d399"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </article>
  );
}
