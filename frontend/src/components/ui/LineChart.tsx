import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '../../lib/utils'

interface DataPoint {
  label: string
  value: number
  color?: string
}

interface LineChartProps {
  data: DataPoint[]
  height?: number
  showGrid?: boolean
  showTooltips?: boolean
  animate?: boolean
  className?: string
}

interface TooltipData {
  x: number
  y: number
  label: string
  value: number
  visible: boolean
}

function LineChart({
  data,
  height = 300,
  showGrid = true,
  showTooltips = true,
  animate = true,
  className = '',
}: LineChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData>({
    x: 0,
    y: 0,
    label: '',
    value: 0,
    visible: false,
  })
  const [isVisible, setIsVisible] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (chartRef.current) {
      observer.observe(chartRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const maxValue = Math.max(...data.map((d) => d.value), 0)
  const paddingX = 50
  const paddingY = 40
  const chartHeight = height - paddingY * 2

  const getYAxisScale = () => {
    if (maxValue === 0) return [0, 1, 2, 3, 4]

    let ceiling: number
    if (maxValue <= 5) ceiling = 5
    else if (maxValue <= 10) ceiling = 10
    else if (maxValue <= 20) ceiling = 20
    else if (maxValue <= 50) ceiling = 50
    else ceiling = Math.ceil(maxValue / 10) * 10

    const ticks = []
    const step = ceiling / 4
    for (let i = 0; i <= 4; i++) {
      ticks.push(Math.round(step * i))
    }
    return ticks
  }

  const yAxisTicks = getYAxisScale().reverse()
  const yAxisMax = yAxisTicks[0]

  const formatValue = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toString()
  }

  const getPoints = useCallback(() => {
    if (data.length === 0) return []
    const width = svgRef.current?.clientWidth || 0
    const usableWidth = width - paddingX * 2
    const pointSpacing = data.length > 1 ? usableWidth / (data.length - 1) : 0

    return data.map((point, index) => {
      const x = paddingX + index * pointSpacing
      const ratio = yAxisMax > 0 ? point.value / yAxisMax : 0
      const y = paddingY + chartHeight * (1 - ratio)
      return { x, y, value: point.value, label: point.label }
    })
  }, [data, yAxisMax, chartHeight, paddingX, paddingY, svgRef])

  const [points, setPoints] = useState<{ x: number; y: number; value: number; label: string }[]>([])

  useEffect(() => {
    const updatePoints = () => {
      setPoints(getPoints())
    }
    updatePoints()
    window.addEventListener('resize', updatePoints)
    return () => window.removeEventListener('resize', updatePoints)
  }, [getPoints])

  const pathData =
    points.length > 0 ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') : ''
  const areaPathData =
    points.length > 0
      ? `${pathData} L ${points[points.length - 1].x} ${paddingY + chartHeight} L ${points[0].x} ${paddingY + chartHeight} Z`
      : ''

  const handlePointHover = (
    _event: React.MouseEvent,
    point: { x: number; y: number; value: number; label: string }
  ) => {
    if (!showTooltips) return
    setTooltip({
      x: point.x,
      y: point.y,
      label: point.label,
      value: point.value,
      visible: true,
    })
  }

  const handlePointLeave = () => {
    setTooltip((prev) => ({ ...prev, visible: false }))
  }

  return (
    <div ref={chartRef} className={cn('relative flex flex-col', className)} style={{ height }}>
      <svg ref={svgRef} width="100%" height="100%" className="absolute inset-0">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EA580C" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#EA580C" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {showGrid &&
          yAxisTicks.map((tick, index) => {
            const ratio = yAxisMax > 0 ? tick / yAxisMax : 0
            const y = paddingY + chartHeight * (1 - ratio)
            return (
              <g key={index}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={`calc(100% - ${paddingX}px)`}
                  y2={y}
                  stroke="currentColor"
                  className="text-zinc-200 dark:text-zinc-800"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 12}
                  y={y}
                  textAnchor="end"
                  alignmentBaseline="middle"
                  className="text-[10px] fill-zinc-400 dark:fill-zinc-500 font-black uppercase tracking-wider"
                >
                  {formatValue(tick)}
                </text>
              </g>
            )
          })}

        {/* Area fill */}
        {points.length > 0 && (
          <path
            d={areaPathData}
            fill="url(#chartGradient)"
            className={cn(
              'transition-all duration-1000 ease-out',
              animate && isVisible ? 'opacity-100' : 'opacity-0'
            )}
          />
        )}

        {/* Line path */}
        {points.length > 0 && (
          <path
            d={pathData}
            fill="none"
            stroke="#EA580C"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn(
              'transition-all duration-700 ease-in-out',
              animate && isVisible ? 'opacity-100' : 'opacity-0'
            )}
          />
        )}

        {/* Data points */}
        {points.map((point, index) => (
          <g key={index} className="group">
            <circle
              cx={point.x}
              cy={point.y}
              r="5"
              fill="white"
              stroke="#EA580C"
              strokeWidth="2.5"
              className={cn(
                'cursor-pointer transition-all duration-500 shadow-xl',
                animate && isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
              )}
              style={{ transitionDelay: `${index * 50}ms` }}
              onMouseEnter={(e) => handlePointHover(e, point)}
              onMouseLeave={handlePointLeave}
            />
            <circle
              cx={point.x}
              cy={point.y}
              r="14"
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={(e) => handlePointHover(e, point)}
              onMouseLeave={handlePointLeave}
            />
            {/* X-axis label */}
            <text
              x={point.x}
              y={paddingY + chartHeight + 25}
              textAnchor="middle"
              className="text-[10px] fill-zinc-400 dark:fill-zinc-500 font-black uppercase tracking-tight"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {showTooltips && tooltip.visible && (
        <div
          className="absolute z-50 pointer-events-none animate-fade-in"
          style={{
            left: tooltip.x,
            top: tooltip.y - 12,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl px-4 py-3 min-w-[130px]">
            <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
              {tooltip.label}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-zinc-900 dark:text-white">
                {formatValue(tooltip.value)}
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-primary-600 dark:bg-primary-500 animate-pulse ml-3 shadow-[0_0_8px_rgba(234,88,12,0.6)]" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LineChart
