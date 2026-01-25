import { useState, useEffect, useRef } from 'react'

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
  className = ''
}: LineChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData>({ x: 0, y: 0, label: '', value: 0, visible: false })
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

  const maxValue = Math.max(...data.map(d => d.value), 1)
  const padding = 60
  const chartWidth = 100 // percentage
  const chartHeight = height - (padding * 2)

  // Calculate dynamic Y-axis scale
  const getYAxisScale = () => {
    if (maxValue === 0) return [0, 1, 2, 3, 4, 5]
    if (maxValue <= 5) return [0, 1, 2, 3, 4, 5]
    if (maxValue <= 10) return [0, 2, 4, 6, 8, 10]
    if (maxValue <= 20) return [0, 5, 10, 15, 20]
    if (maxValue <= 50) return [0, 10, 20, 30, 40, 50]
    if (maxValue <= 100) return [0, 20, 40, 60, 80, 100]
    const step = Math.ceil(maxValue / 5)
    const roundedMax = Math.ceil(maxValue / step) * step
    const ticks = []
    for (let i = 0; i <= 5; i++) {
      ticks.push(Math.round((roundedMax / 5) * i))
    }
    return ticks
  }

  const yAxisTicks = getYAxisScale()
  const yAxisMax = yAxisTicks[yAxisTicks.length - 1]

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }
    return value.toString()
  }

  // Calculate points for line
  const getPoints = () => {
    const width = chartWidth - 40 // Account for margins
    const pointSpacing = width / (data.length - 1 || 1)
    
    return data.map((point, index) => {
      const x = 40 + (index * pointSpacing)
      const y = chartHeight - ((point.value / yAxisMax) * chartHeight)
      return { x, y, value: point.value, label: point.label }
    })
  }

  const points = getPoints()
  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  const handlePointHover = (event: React.MouseEvent, point: { x: number; y: number; value: number; label: string }) => {
    if (!showTooltips) return

    const chartRect = chartRef.current?.getBoundingClientRect()
    if (chartRect) {
      setTooltip({
        x: point.x,
        y: point.y,
        label: point.label,
        value: point.value,
        visible: true
      })
    }
  }

  const handlePointLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }))
  }

  return (
    <div
      ref={chartRef}
      className={`relative ${className}`}
      style={{ height }}
    >
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        className="absolute inset-0"
        style={{ padding: `${padding}px` }}
      >
        {/* Grid lines */}
        {showGrid && yAxisTicks.map((tick, index) => {
          const ratio = yAxisMax > 0 ? tick / yAxisMax : 0
          const y = chartHeight - (ratio * chartHeight)
          return (
            <line
              key={index}
              x1="40"
              y1={y}
              x2="100%"
              y2={y}
              stroke="var(--border-light)"
              strokeWidth="1"
              opacity="0.3"
            />
          )
        })}

        {/* Line path */}
        <path
          d={pathData}
          fill="none"
          stroke="var(--primary-orange)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={animate && isVisible ? 'chart-line' : ''}
          style={{
            strokeDasharray: animate && isVisible ? '1000' : '0',
            strokeDashoffset: animate && isVisible ? (isVisible ? '0' : '1000') : '0',
            transition: 'stroke-dashoffset 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          }}
        />

        {/* Data points */}
        {points.map((point, index) => (
          <g key={index}>
            <circle
              cx={point.x}
              cy={point.y}
              r="6"
              fill="var(--primary-orange)"
              stroke="var(--background-white)"
              strokeWidth="2"
              className="cursor-pointer hover:r-8 transition-all duration-200"
              onMouseEnter={(e) => handlePointHover(e as any, point)}
              onMouseLeave={handlePointLeave}
            />
            {/* X-axis label */}
            <text
              x={point.x}
              y={chartHeight + 20}
              textAnchor="middle"
              className="text-xs fill-secondary"
              fontSize="12"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>

      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-secondary pr-2 pointer-events-none">
        {yAxisTicks.map((tick, index) => (
          <span key={index} className="leading-none">
            {formatValue(tick)}
          </span>
        ))}
      </div>

      {/* Tooltip */}
      {showTooltips && tooltip.visible && (
        <div
          className="absolute z-50 pointer-events-none tooltip-enter"
          style={{
            left: tooltip.x + 40,
            top: tooltip.y - 50,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="bg-background-white border border-border-light rounded-lg shadow-lg px-3 py-2 text-sm">
            <div className="font-medium text-primary">{tooltip.label}</div>
            <div className="text-secondary">Value: {formatValue(tooltip.value)}</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LineChart