import { useEffect, useState, useRef } from 'react'

interface DecryptedTextProps {
  text: string
  speed?: number
  maxIterations?: number
  className?: string
  parentClassName?: string
  encryptedClassName?: string
  animateOn?: 'view' | 'hover'
  [key: string]: unknown
}

export default function DecryptedText({
  text,
  speed = 50,
  maxIterations = 10,
  className = '',
  parentClassName = '',
  encryptedClassName = '',
  animateOn = 'view',
  ...props
}: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState(text)
  const [isHovering, setIsHovering] = useState(false)
  const [isRevealed, setIsRevealed] = useState(false)
  const [hasAnimated, setHasAnimated] = useState(false)
  const containerRef = useRef<HTMLSpanElement>(null)

  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+'

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined
    let currentIteration = 0

    const startAnimation = () => {
      if (hasAnimated && animateOn === 'view') return

      interval = setInterval(() => {
        setDisplayText((prevText) =>
          prevText
            .split('')
            .map((char, index) => {
              if (char === ' ') return ' '
              if (currentIteration > maxIterations) return text[index]
              return characters[Math.floor(Math.random() * characters.length)]
            })
            .join('')
        )

        currentIteration++
        if (currentIteration > maxIterations) {
          clearInterval(interval)
          setDisplayText(text)
          setHasAnimated(true)
          setIsRevealed(true)
        }
      }, speed)
    }

    if (animateOn === 'view') {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            startAnimation()
            observer.disconnect()
          }
        },
        { threshold: 0.1 }
      )

      if (containerRef.current) {
        observer.observe(containerRef.current)
      }

      return () => observer.disconnect()
    } else if (animateOn === 'hover' && isHovering) {
      startAnimation()
    }

    return () => clearInterval(interval)
  }, [text, speed, maxIterations, isHovering, animateOn, hasAnimated])

  return (
    <span
      ref={containerRef}
      className={parentClassName}
      onMouseEnter={() => animateOn === 'hover' && setIsHovering(true)}
      onMouseLeave={() => animateOn === 'hover' && setIsHovering(false)}
      {...props}
    >
      <span className={isRevealed ? className : encryptedClassName}>{displayText}</span>
    </span>
  )
}
