import { useState, useEffect } from 'react'

interface IconProps {
  name: string
  size?: number
  className?: string
  alt?: string
}

function Icon({ name, size = 24, className = '', alt = '' }: IconProps) {
  const [iconModule, setIconModule] = useState<any>(null)

  useEffect(() => {
    // Dynamically import the SVG as a raw string
    import(`../icons/${name}.svg?raw`)
      .then((module) => {
        setIconModule(module)
      })
      .catch((error) => {
        console.error(`Failed to load icon: ${name}.svg`, error)
        setIconModule(null)
      })
  }, [name])

  if (!iconModule) {
    // Fallback while loading or if failed
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          display: 'inline-block',
          background: 'currentColor',
          opacity: 0.1,
          borderRadius: '2px'
        }}
        role="img"
        aria-label={alt}
      />
    )
  }

  // Render the imported SVG
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        display: 'inline-block'
      }}
      dangerouslySetInnerHTML={{ __html: iconModule.default }}
      role="img"
      aria-label={alt}
    />
  )
}

export default Icon