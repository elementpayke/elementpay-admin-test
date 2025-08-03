"use client"
import {
  CartesianGrid,
  Line,
  LineChart,
  Bar,
  BarChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts"

import { type ChartConfig, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import React from "react"
import { ChartContainer as RechartsChartContainer } from "@tremor/react"

// Define types for common chart props
interface BaseChartProps {
  data: Record<string, any>[]
  config: ChartConfig
  className?: string
}

interface LineChartProps extends BaseChartProps {
  lines: { dataKey: string; stroke: string; type?: "monotone" | "linear" }[]
}

interface BarChartProps extends BaseChartProps {
  bars: { dataKey: string; fill: string }[]
}

interface AreaChartProps extends BaseChartProps {
  areas: { dataKey: string; fill: string; stroke: string; type?: "monotone" | "linear" }[]
}

interface PieChartProps extends BaseChartProps {
  dataKey: string
  nameKey: string
  outerRadius?: number
  innerRadius?: number
  fill?: string
  label?: boolean
}

interface RadialBarChartProps extends BaseChartProps {
  dataKey: string
  angleAxisDataKey?: string
  barSize?: number
  innerRadius?: string | number
  outerRadius?: string | number
}

const ChartContainer = React.forwardRef<HTMLDivElement, any>(({ className, ...props }, ref) => (
  <RechartsChartContainer ref={ref} className={cn("flex aspect-video h-full w-full", className)} {...props} />
))
ChartContainer.displayName = "ChartContainer"

// Line Chart Component
const ChartLine = ({ data, config, lines, className }: LineChartProps) => (
  <ChartContainer config={config} className={className}>
    <ResponsiveContainer>
      <LineChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => value.slice(0, 3)}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        {lines.map((lineProps, index) => (
          <Line key={index} dot={false} {...lineProps} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  </ChartContainer>
)

// Bar Chart Component
const ChartBar = ({ data, config, bars, className }: BarChartProps) => (
  <ChartContainer config={config} className={className}>
    <ResponsiveContainer>
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => value.slice(0, 3)}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        {bars.map((barProps, index) => (
          <Bar key={index} {...barProps} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  </ChartContainer>
)

// Area Chart Component
const ChartArea = ({ data, config, areas, className }: AreaChartProps) => (
  <ChartContainer config={config} className={className}>
    <ResponsiveContainer>
      <AreaChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => value.slice(0, 3)}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        {areas.map((areaProps, index) => (
          <Area key={index} type="monotone" {...areaProps} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  </ChartContainer>
)

// Pie Chart Component
const ChartPie = ({
  data,
  config,
  dataKey,
  nameKey,
  outerRadius = 80,
  innerRadius = 0,
  fill = "#8884d8",
  label,
  className,
}: PieChartProps) => (
  <ChartContainer config={config} className={className}>
    <ResponsiveContainer>
      <PieChart>
        <Tooltip content={<ChartTooltipContent />} />
        <Legend />
        <Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          outerRadius={outerRadius}
          innerRadius={innerRadius}
          fill={fill}
          label={label}
        />
      </PieChart>
    </ResponsiveContainer>
  </ChartContainer>
)

// Radial Bar Chart Component
const ChartRadialBar = ({
  data,
  config,
  dataKey,
  angleAxisDataKey = "name",
  barSize = 10,
  innerRadius = "20%",
  outerRadius = "100%",
  className,
}: RadialBarChartProps) => (
  <ChartContainer config={config} className={className}>
    <ResponsiveContainer>
      <RadialBarChart
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        barSize={barSize}
        data={data}
        startAngle={90}
        endAngle={-270}
      >
        <RadialBar
          minAngle={15}
          label={{ position: "insideStart", fill: "#fff" }}
          background
          clockWise
          dataKey={dataKey}
        />
        <Tooltip content={<ChartTooltipContent />} />
        <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" />
      </RadialBarChart>
    </ResponsiveContainer>
  </ChartContainer>
)

export { ChartLine, ChartBar, ChartArea, ChartPie, ChartRadialBar, ChartContainer }
