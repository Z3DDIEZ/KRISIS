import * as LucideIcons from 'lucide-react'
import { LucideProps } from 'lucide-react'

interface IconProps extends LucideProps {
  name: string
  size?: number | string
  className?: string
  alt?: string
}

const iconMap: Record<string, keyof typeof LucideIcons> = {
  // Navigation
  'dashboard': 'LayoutDashboard',
  'work': 'Briefcase',
  'trending-up': 'TrendingUp',
  'person': 'User',
  'download': 'Download',
  'settings': 'Settings',
  'logout': 'LogOut',

  // Actions
  'add': 'Plus',
  'search': 'Search',
  'close': 'X',
  'visibility': 'Eye',
  'edit': 'Edit3',
  'check': 'Check',
  'bolt': 'Zap',
  'info': 'Info',
  'warning': 'AlertTriangle',
  'delete': 'Trash2',
  'grid': 'Grid',
  'table': 'Table',
  'list': 'List',
  'arrow-left': 'ChevronLeft',
  'arrow-right': 'ChevronRight',
  'arrow-up': 'ChevronUp',
  'arrow-down': 'ChevronDown',

  // Miscellaneous
  'calendar': 'Calendar',
  'pie-chart': 'PieChart',
  'bar-chart': 'BarChart3',
  'line-chart': 'LineChart',
  'lightbulb': 'Lightbulb',
  'verified': 'CheckCircle',
  'public': 'Globe',
}

function Icon({ name, size = 24, className = '', alt = '', ...props }: IconProps) {
  const iconName = iconMap[name] || 'HelpCircle'
  const LucideIcon = (LucideIcons as any)[iconName] as React.FC<LucideProps>

  if (!LucideIcon) {
    console.warn(`Icon "${name}" (mapped to "${String(iconName)}") not found in lucide-react`)
    return <LucideIcons.HelpCircle size={size} className={className} {...props} />
  }

  return (
    <LucideIcon
      size={size}
      className={className}
      aria-label={alt || name}
      {...props}
    />
  )
}

export default Icon