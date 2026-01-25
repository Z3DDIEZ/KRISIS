import { useState, useEffect, useRef } from 'react'

interface DataPoint {
  label: string
  value: number
  color?: string
}

interface BarChartProps {
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

function BarChart({
  data,
  height = 300,
  showGrid = true,
  showTooltips = true,
  animate = true,
  className = ''
}: BarChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData>({ x: 0, y: 0, label: '', value: 0, visible: false })
  const [isVisible, setIsVisible] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)

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

  const maxValue = Math.max(...data.map(d => d.value), 1) // Ensure at least 1 to avoid division by zero
  const padding = 60
  const chartWidth = 100 // percentage
  const chartHeight = height - (padding * 2)
  
  // Calculate dynamic Y-axis scale based on max value
  const getYAxisScale = () => {
    if (maxValue === 0) return [0, 1, 2, 3, 4, 5]
    if (maxValue <= 5) return [0, 1, 2, 3, 4, 5]
    if (maxValue <= 10) return [0, 2, 4, 6, 8, 10]
    if (maxValue <= 20) return [0, 5, 10, 15, 20]
    if (maxValue <= 50) return [0, 10, 20, 30, 40, 50]
    if (maxValue <= 100) return [0, 20, 40, 60, 80, 100]
    // For larger values, use smart rounding
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

  const getBarColor = (index: number, customColor?: string) => {
    if (customColor) return customColor

    // Dynamic color based on theme and data
    const colors = [
      'var(--primary-orange)',
      'var(--primary-blue)',
      'var(--status-success)',
      'var(--status-warning)',
      'var(--primary-purple, #8B5CF6)',
      'var(--primary-green, #10B981)'
    ]
    return colors[index % colors.length]
  }

  const handleBarHover = (event: React.MouseEvent, point: DataPoint, index: number) => {
    if (!showTooltips) return

    const rect = event.currentTarget.getBoundingClientRect()
    const chartRect = chartRef.current?.getBoundingClientRect()

    if (chartRect) {
      setTooltip({
        x: rect.left - chartRect.left + rect.width / 2,
        y: rect.top - chartRect.top,
        label: point.label,
        value: point.value,
        visible: true
      })
    }
  }

  const handleBarLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }))
  }

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }
    return value.toString()
  }

  return (
    <div
      ref={chartRef}
      className={`relative ${className}`}
      style={{ height }}
    >
      {/* Chart Area */}
      <div className="relative" style={{ padding: `${padding}px` }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-secondary pr-2">
          {yAxisTicks.map((tick, index) => (
            <span key={index} className="leading-none">
              {formatValue(tick)}
            </span>
          ))}
        </div>

        {/* Grid lines */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none">
            {yAxisTicks.map((tick, index) => {
              const ratio = yAxisMax > 0 ? tick / yAxisMax : 0
              return (
                <div
                  key={index}
                  className="absolute w-full border-t border-border-light opacity-30"
                  style={{
                    top: `${(1 - ratio) * 100}%`,
                    left: '2.5rem'
                  }}
                />
              )
            })}
          </div>
        )}

        {/* Bars */}
        <div
          className="flex items-end justify-between gap-2"
          style={{ height: chartHeight, marginLeft: '2.5rem' }}
        >
          {data.map((point, index) => {
            const percentage = yAxisMax > 0 ? (point.value / yAxisMax) * 100 : 0
            const barColor = getBarColor(index, point.color)

            return (
              <div
                key={point.label}
                className="flex flex-col items-center group flex-1 max-w-16"
              >
                {/* Bar */}
                <div
                  className={`w-full rounded-t transition-all duration-1000 ease-out cursor-pointer hover:opacity-80 ${
                    animate && isVisible ? 'chart-bar' : ''
                  }`}
                  style={{
                    height: animate && isVisible ? `${percentage}%` : `${percentage}%`,
                    background: barColor,
                    minHeight: percentage > 0 ? '4px' : '0px',
                    transitionDelay: animate ? `${index * 100}ms` : '0ms'
                  }}
                  onMouseEnter={(e) => handleBarHover(e, point, index)}
                  onMouseLeave={handleBarLeave}
                  onMouseMove={(e) => handleBarHover(e, point, index)}
                />

                {/* X-axis label */}
                <div className="text-xs text-secondary mt-2 text-center leading-tight max-w-full truncate">
                  {point.label}
                </div>

                {/* Value label on top of bar */}
                {point.value > 0 && (
                  <div
                    className="absolute text-xs font-medium text-primary transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                    style={{
                      bottom: `${percentage}%`,
                      left: '50%',
                      marginBottom: '4px'
                    }}
                  >
                    {formatValue(point.value)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Tooltip */}
      {showTooltips && tooltip.visible && (
        <div
          className="absolute z-50 pointer-events-none tooltip-enter"
          style={{
            left: tooltip.x,
            top: tooltip.y - 60,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="bg-background-white border border-border-light rounded-lg shadow-lg px-3 py-2 text-sm">
            <div className="font-medium text-primary">{tooltip.label}</div>
            <div className="text-secondary">Value: {formatValue(tooltip.value)}</div>
            {/* Tooltip arrow */}
            <div
              className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-background-white"
              style={{ marginTop: '-1px' }}
            />
          </div>
        </div>
      )}

      {/* Chart Legend */}
      {data.length > 0 && (
        <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs">
          {data.slice(0, 6).map((point, index) => (
            <div key={point.label} className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded"
                style={{ background: getBarColor(index, point.color) }}
              />
              <span className="text-secondary truncate max-w-20">{point.label}</span>
            </div>
          ))}
          {data.length > 6 && (
            <span className="text-secondary">+{data.length - 6} more</span>
          )}
        </div>
      )}

      {/* Empty state */}
      {data.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">📊</div>
            <div className="text-secondary">No data to display</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BarChart