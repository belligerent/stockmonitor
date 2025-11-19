import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { PricePoint } from '../types';

interface PriceChartProps {
  data: PricePoint[];
  color?: string;
}

const PriceChart: React.FC<PriceChartProps> = ({ data, color = "#10b981" }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-slate-500 text-sm">
        Waiting for data...
      </div>
    );
  }

  // Format data for recharts
  const chartData = data.map(d => ({
    time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    value: d.value,
    originalTimestamp: d.timestamp
  }));

  // Calculate domain for Y-axis to make chart look dynamic (not starting from 0)
  const minVal = Math.min(...data.map(d => d.value));
  const maxVal = Math.max(...data.map(d => d.value));
  const padding = (maxVal - minVal) * 0.1;

  return (
    <div className="h-40 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis 
            dataKey="time" 
            hide={true} 
          />
          <YAxis 
            domain={[minVal - padding, maxVal + padding]} 
            hide={true} 
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
            itemStyle={{ color: color }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(value: number) => [value.toFixed(4), 'Price']}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={2} 
            dot={false} 
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriceChart;
