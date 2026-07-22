import React from 'react';

interface BarChartProps {
  data: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
  title: string;
  description?: string;
  maxValue?: number;
  height?: number;
  barWidth?: number;
  barGap?: number;
}

const BarChart: React.FC<BarChartProps> = ({
  data,
  title,
  description,
  maxValue,
  height = 200,
  barWidth = 40,
  barGap = 20
}) => {
  // Calculate max value if not provided
  const max = maxValue || Math.max(...data.map(d => d.value), 1);

  // Calculate chart dimensions
  const chartWidth = data.length * (barWidth + barGap) - barGap;
  const padding = 60;
  const chartHeight = height - padding * 2;

  // Default colors
  const defaultColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16'];

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        {description && (
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        )}
      </div>

      <div className="relative">
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${chartWidth + padding * 2} ${height}`}
          className="overflow-visible"
        >
          {/* Y-axis */}
          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={height - padding}
            stroke="#E5E7EB"
            strokeWidth="2"
          />

          {/* X-axis */}
          <line
            x1={padding}
            y1={height - padding}
            x2={chartWidth + padding}
            y2={height - padding}
            stroke="#E5E7EB"
            strokeWidth="2"
          />

          {/* Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
            const y = height - padding - (ratio * chartHeight);
            const value = Math.round(max * ratio);
            return (
              <g key={index}>
                <line
                  x1={padding - 5}
                  y1={y}
                  x2={padding}
                  y2={y}
                  stroke="#E5E7EB"
                  strokeWidth="1"
                />
                <text
                  x={padding - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-xs fill-gray-500"
                >
                  {value}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((item, index) => {
            const x = padding + index * (barWidth + barGap);
            const barHeight = (item.value / max) * chartHeight;
            const y = height - padding - barHeight;
            const color = item.color || defaultColors[index % defaultColors.length];

            return (
              <g key={index}>
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={color}
                  rx="4"
                  className="transition-all duration-300 hover:opacity-80"
                />

                {/* Value label on bar */}
                {item.value > 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={y - 8}
                    textAnchor="middle"
                    className="text-xs font-semibold fill-gray-700"
                  >
                    {item.value}
                  </text>
                )}

                {/* X-axis label */}
                <text
                  x={x + barWidth / 2}
                  y={height - padding + 20}
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                >
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default BarChart;