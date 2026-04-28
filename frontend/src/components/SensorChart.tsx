/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SensorChartProps {
  data: any[];
  dataKey: string;
  color: string;
  title: string;
  min?: number;
  max?: number;
}

export function SensorChart({ data, dataKey, color, title, min = 0, max = 100 }: SensorChartProps) {
  return (
    <div className="h-48 w-full">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[var(--accent-cyan)] opacity-50">{title}</span>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(56, 189, 248, 0.05)" vertical={false} />
          <XAxis hide dataKey="timestamp" />
          <YAxis hide domain={[min, max]} />
          <Tooltip
            contentStyle={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '10px', backdropFilter: 'blur(12px)' }}
            itemStyle={{ color: color }}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
