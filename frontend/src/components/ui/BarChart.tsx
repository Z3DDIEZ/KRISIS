import { useState, useEffect, useRef } from 'react'
import { cn } from '../../lib/utils'
import Icon from './Icon'

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
  className = '',
}: BarChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData>({
    x: 0,
    y: 0,
    label: '',
    value: 0,
    visible: false,
  })
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

  const maxValue = Math.max(...data.map((d) => d.value), 0)
  const padding = 40 // Reduced padding to give more space to chart

  // Calculate dynamic Y-axis scale based on max value
  const getYAxisScale = () => {
    if (maxValue === 0) return [0, 1, 2, 3, 4]

    // Find a nice round number for the ceiling
    let ceiling: number
    if (maxValue <= 5) ceiling = 5
    else if (maxValue <= 10) ceiling = 10
    else if (maxValue <= 25) ceiling = 25
    else if (maxValue <= 50) ceiling = 50
    else if (maxValue <= 100) ceiling = 100
    else {
      // For larger values, find the next power of 10 or multiple of 50/100
      const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)))
      ceiling = Math.ceil(maxValue / (magnitude / 2)) * (magnitude / 2)
    }

    const ticks = []
    const step = ceiling / 4
    for (let i = 0; i <= 4; i++) {
      ticks.push(Math.round(step * i))
    }
    return ticks
  }

  const yAxisTicks = getYAxisScale().reverse() // Show highest at top
  const yAxisMax = yAxisTicks[0]

  const getBarColor = (index: number, customColor?: string) => {
    if (customColor) return customColor

    // Dynamic color based on theme and data
    const colors = [
      '#EA580C', // primary-600
      '#2563EB', // blue-600
      '#059669', // emerald-600
      '#D97706', // amber-600
      '#7C3AED', // violet-600
      '#71717A', // zinc-500
    ]
    return colors[index % colors.length]
  }

  const handleBarHover = (_event: React.MouseEvent, point: DataPoint) => {
    if (!showTooltips) return

    const rect = _event.currentTarget.getBoundingClientRect()
    const chartRect = chartRef.current?.getBoundingClientRect()

    if (chartRect) {
      setTooltip({
        x: rect.left - chartRect.left + rect.width / 2,
        y: rect.top - chartRect.top,
        label: point.label,
        value: point.value,
        visible: true,
      })
    }
  }

  const handleBarLeave = () => {
    setTooltip((prev) => ({ ...prev, visible: false }))
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
    <div ref={chartRef} className={cn('relative flex flex-col', className)} style={{ height }}>
      {/* Chart Area */}
      <div className="relative flex-1 flex" style={{ padding: `10px 0 30px ${padding}px` }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-[30px] flex flex-col justify-between text-[10px] font-black text-zinc-400 dark:text-zinc-500 pr-3 text-right w-[40px] pointer-events-none uppercase tracking-wider">
          {yAxisTicks.map((tick, index) => (
            <span key={index} className="leading-none">
              {formatValue(tick)}
            </span>
          ))}
        </div>

        {/* Chart Content Container */}
        <div className="relative flex-1 flex items-end">
          {/* Grid lines */}
          {showGrid && (
            <div className="absolute inset-0 pointer-events-none">
              {yAxisTicks.map((tick, index) => {
                const ratio = yAxisMax > 0 ? tick / yAxisMax : 0
                return (
                  <div
                    key={index}
                    className="absolute w-full border-t border-zinc-100 dark:border-zinc-800/50"
                    style={{
                      bottom: `${ratio * 100}%`,
                      left: 0,
                    }}
                  />
                )
              })}
            </div>
          )}

          {/* Bars */}
          <div className="relative w-full h-full flex items-end justify-around gap-2 px-2">
            {data.map((point, index) => {
              const percentage = yAxisMax > 0 ? (point.value / yAxisMax) * 100 : 0
              const barColor = getBarColor(index, point.color)

              return (
                <div
                  key={`${point.label}-${index}`}
                  className="flex flex-col items-center group flex-1 max-w-[60px] relative h-full justify-end"
                >
                  {/* Bar */}
                  <div
                    className={cn(
                      'w-full rounded-t-lg transition-all duration-1000 ease-out cursor-pointer hover:scale-x-105 hover:brightness-110 relative',
                      animate && isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    )}
                    style={{
                      height: `${percentage}%`,
                      background: barColor,
                      minHeight: point.value > 0 ? '4px' : '0px',
                      transitionDelay: animate ? `${index * 50}ms` : '0ms',
                    }}
                    onMouseEnter={(e) => handleBarHover(e, point)}
                    onMouseLeave={handleBarLeave}
                  >
                    {/* Hover value indicator (Desktop) */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-900 dark:bg-zinc-800 text-white text-[10px] font-black px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl border border-white/10">
                      {formatValue(point.value)}
                    </div>
                  </div>

                  {/* X-axis label */}
                  <div className="absolute -bottom-6 left-0 right-0 text-[10px] font-black text-zinc-400 dark:text-zinc-500 text-center truncate pt-1 uppercase tracking-tight">
                    {point.label}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tooltip (Portal-style interaction) */}
      {showTooltips && tooltip.visible && (
        <div
          className="absolute z-50 pointer-events-none animate-fade-in"
          style={{
            left: tooltip.x,
            top: tooltip.y - 10,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl px-4 py-3 min-w-[120px]">
            <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
              {tooltip.label}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-zinc-900 dark:text-white">
                {formatValue(tooltip.value)}
              </span>
              <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse ml-3" />
            </div>
          </div>
        </div>
      )}

      {/* Chart Legend (Optional - only if many colors) */}
      {data.length > 5 && (
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-8 text-[10px] font-medium border-t border-border-light/30 pt-3">
          {data.slice(0, 8).map((point, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: getBarColor(index, point.color) }}
              />
              <span className="text-secondary">{point.label}</span>
            </div>
          ))}
          {data.length > 8 && <span className="text-muted">+{data.length - 8} more</span>}
        </div>
      )}

      {/* Empty state */}
      {data.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-secondary mb-4">
              <Icon name="bar-chart" size={48} className="opacity-20" />
            </div>
            <div className="text-secondary font-medium">No data to display</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BarChart
