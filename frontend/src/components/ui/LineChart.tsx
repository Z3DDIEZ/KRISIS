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

  const maxValue = Math.max(...data.map(d => d.value), 0)
  const paddingX = 50
  const paddingY = 40
  const chartHeight = height - (paddingY * 2)

  // Calculate dynamic Y-axis scale
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

  // Calculate points for line - Span the full width properly
  const getPoints = () => {
    if (data.length === 0) return []

    // Get actual width of the SVG container
    const width = svgRef.current?.clientWidth || 0
    const usableWidth = width - (paddingX * 2)
    const pointSpacing = data.length > 1 ? usableWidth / (data.length - 1) : 0

    return data.map((point, index) => {
      const x = paddingX + (index * pointSpacing)
      const ratio = yAxisMax > 0 ? point.value / yAxisMax : 0
      const y = paddingY + (chartHeight * (1 - ratio))
      return { x, y, value: point.value, label: point.label }
    })
  }

  const [points, setPoints] = useState<{ x: number, y: number, value: number, label: string }[]>([])

  useEffect(() => {
    // Need to wait for SVG ref to get clientWidth
    const updatePoints = () => {
      setPoints(getPoints())
    }
    updatePoints()
    window.addEventListener('resize', updatePoints)
    return () => window.removeEventListener('resize', updatePoints)
  }, [data, yAxisMax])

  const pathData = points.length > 0 ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') : ''
  // Area path for gradient
  const areaPathData = points.length > 0
    ? `${pathData} L ${points[points.length - 1].x} ${paddingY + chartHeight} L ${points[0].x} ${paddingY + chartHeight} Z`
    : ''

  const handlePointHover = (_event: React.MouseEvent, point: { x: number; y: number; value: number; label: string }) => {
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
      className={`relative flex flex-col ${className}`}
      style={{ height }}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        className="absolute inset-0"
      >
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary-orange)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--primary-orange)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {showGrid && yAxisTicks.map((tick, index) => {
          const ratio = yAxisMax > 0 ? tick / yAxisMax : 0
          const y = paddingY + (chartHeight * (1 - ratio))
          return (
            <g key={index}>
              <line
                x1={paddingX}
                y1={y}
                x2={`calc(100% - ${paddingX}px)`}
                y2={y}
                stroke="var(--border-light)"
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.5"
              />
              <text
                x={paddingX - 10}
                y={y}
                textAnchor="end"
                alignmentBaseline="middle"
                className="text-[10px] fill-secondary font-medium"
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
            className={`transition-all duration-1000 ease-out ${animate && isVisible ? 'opacity-100' : 'opacity-0'
              }`}
          />
        )}

        {/* Line path */}
        {points.length > 0 && (
          <path
            d={pathData}
            fill="none"
            stroke="var(--primary-orange)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={animate && isVisible ? 'opacity-100' : 'opacity-0'}
            style={{
              transition: 'opacity 0.5s ease-in'
            }}
          />
        )}

        {/* Data points */}
        {points.map((point, index) => (
          <g key={index} className="group">
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill="var(--background-white)"
              stroke="var(--primary-orange)"
              strokeWidth="2"
              className={`cursor-pointer transition-all duration-300 ${animate && isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
                }`}
              style={{ transitionDelay: `${index * 50}ms` }}
              onMouseEnter={(e) => handlePointHover(e as any, point)}
              onMouseLeave={handlePointLeave}
            />
            {/* Invisibile large circle for better hover area */}
            <circle
              cx={point.x}
              cy={point.y}
              r="12"
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={(e) => handlePointHover(e as any, point)}
              onMouseLeave={handlePointLeave}
            />
            {/* X-axis label */}
            <text
              x={point.x}
              y={paddingY + chartHeight + 20}
              textAnchor="middle"
              className="text-[10px] fill-secondary font-medium"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {showTooltips && tooltip.visible && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y - 10,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="bg-background-white/95 backdrop-blur-md border border-border-light rounded-lg shadow-xl px-3 py-2 text-xs">
            <div className="font-bold text-primary mb-0.5">{tooltip.label}</div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary-orange" />
              <span className="text-secondary font-medium">Trend:</span>
              <span className="text-primary font-bold">{formatValue(tooltip.value)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LineChart