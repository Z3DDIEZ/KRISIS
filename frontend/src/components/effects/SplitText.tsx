import { useSprings, animated, config } from '@react-spring/web'
import { useEffect, useState, useRef } from 'react'

interface SplitTextProps {
  text: string
  className?: string
  delay?: number
  animationConfig?: object
  textAlign?: 'left' | 'right' | 'center'
  onAnimationComplete?: () => void
}

export default function SplitText({
  text,
  className = '',
  delay = 0,
  animationConfig = config.molasses,
  textAlign = 'left',
  onAnimationComplete,
}: SplitTextProps) {
  const words = text.split(' ')
  const [inView, setInView] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.unobserve(ref.current!)
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  const springs = useSprings(
    words.length,
    words.map((_, i) => ({
      from: { opacity: 0, transform: 'translate3d(0,40px,0)' },
      to: inView
        ? async (next: (arg0: { opacity: number; transform: string; delay: number }) => Promise<void>) => {
            await next({ opacity: 1, transform: 'translate3d(0,0,0)', delay: i * 100 + delay })
            if (i === words.length - 1 && onAnimationComplete) {
              onAnimationComplete()
            }
          }
        : { opacity: 0, transform: 'translate3d(0,40px,0)' },
      config: animationConfig,
    }))
  )

  return (
    <div
      ref={ref}
      className={`flex flex-wrap ${className}`}
      style={{ textAlign, justifyContent: textAlign === 'center' ? 'center' : 'flex-start' }}
    >
      {springs.map((props, i: number) => (
        <animated.span key={i} style={props} className="inline-block mr-[0.2em] last:mr-0">
          {words[i]}
        </animated.span>
      ))}
    </div>
  )
}
