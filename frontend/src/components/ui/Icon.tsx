import {
  LayoutDashboard,
  Briefcase,
  TrendingUp,
  User,
  Download,
  Settings,
  LogOut,
  Plus,
  Search,
  X,
  Eye,
  Edit3,
  Check,
  Zap,
  Info,
  AlertTriangle,
  Trash2,
  Grid,
  Table,
  List,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Calendar,
  PieChart,
  BarChart3,
  LineChart,
  Lightbulb,
  CheckCircle,
  Globe,
  HelpCircle,
  type LucideIcon,
  type LucideProps
} from 'lucide-react'

interface IconProps extends LucideProps {
  name: string
  size?: number | string
  className?: string
  alt?: string
}

const iconMap: Record<string, LucideIcon> = {
  // Navigation
  'dashboard': LayoutDashboard,
  'work': Briefcase,
  'trending-up': TrendingUp,
  'person': User,
  'download': Download,
  'settings': Settings,
  'logout': LogOut,

  // Actions
  'add': Plus,
  'search': Search,
  'close': X,
  'visibility': Eye,
  'edit': Edit3,
  'check': Check,
  'bolt': Zap,
  'info': Info,
  'warning': AlertTriangle,
  'delete': Trash2,
  'grid': Grid,
  'table': Table,
  'list': List,
  'arrow-left': ChevronLeft,
  'arrow-right': ChevronRight,
  'arrow-up': ChevronUp,
  'arrow-down': ChevronDown,

  // Miscellaneous
  'calendar': Calendar,
  'pie-chart': PieChart,
  'bar-chart': BarChart3,
  'line-chart': LineChart,
  'lightbulb': Lightbulb,
  'verified': CheckCircle,
  'public': Globe,
}

function Icon({ name, size = 24, className = '', alt = '', ...props }: IconProps) {
  const SvgIcon = iconMap[name] || HelpCircle

  if (!iconMap[name]) {
    console.warn(`Icon "${name}" not found in lucide-react explicit imports`)
  }

  return (
    <SvgIcon
      size={size as number | string}
      className={className}
      aria-label={alt || name}
      {...props}
    />
  )
}

export default Icon