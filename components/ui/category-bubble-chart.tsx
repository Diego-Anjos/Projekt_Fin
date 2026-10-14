"use client";

import { hierarchy, pack } from "d3-hierarchy";
import type { LucideIcon } from "lucide-react";
import { useMemo } from "react";

export type CategoryBubble = {
  id: string;
  name: string;
  value: number;
  icon: LucideIcon;
  color: string;
};

type BubbleTree = {
  id?: string;
  name?: string;
  value?: number;
  icon?: LucideIcon;
  color?: string;
  children?: BubbleTree[];
};

const SIZE = 300;

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

export function CategoryBubbleChart({ data }: { data: CategoryBubble[] }) {
  const leaves = useMemo(() => {
    if (data.length === 0) return [];

    const root = hierarchy<BubbleTree>({ children: data }).sum((node) => node.value ?? 0);
    root.sort((left, right) => (right.value ?? 0) - (left.value ?? 0));

    return pack<BubbleTree>().size([SIZE, SIZE]).padding(5)(root).leaves();
  }, [data]);

  const total = leaves.reduce((sum, leaf) => sum + (leaf.value ?? 0), 0);

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="h-auto w-full font-sans"
      role="img"
      aria-label="Gráfico de bolhas das despesas por categoria"
    >
      {leaves.map((node) => {
        const { id, name, icon: Icon, color } = node.data;
        if (!id || !name || !Icon || !color || node.r <= 0) return null;

        const showPercent = node.r >= 20;
        const iconSize = Math.min(28, node.r * (showPercent ? 0.46 : 0.7));
        const fontSize = Math.min(16, Math.max(9, node.r * 0.22));
        const gap = 3;
        const blockHeight = showPercent ? iconSize + gap + fontSize : iconSize;
        const top = -blockHeight / 2;
        const percent = total > 0 ? ((node.value ?? 0) / total) * 100 : 0;

        return (
          <g key={id} transform={`translate(${node.x},${node.y})`}>
            <title>
              {name}: {percentFormatter.format(percent)}%
            </title>
            <circle r={node.r} fill={color} fillOpacity={0.2} stroke={color} strokeWidth={1.5} />
            <Icon
              x={-iconSize / 2}
              y={top}
              width={iconSize}
              height={iconSize}
              color={color}
              stroke={color}
              strokeWidth={2}
              aria-hidden="true"
            />
            {showPercent ? (
              <text
                y={top + iconSize + gap + fontSize / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={color}
                fontSize={fontSize}
                fontWeight={600}
              >
                {percentFormatter.format(percent)}%
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
