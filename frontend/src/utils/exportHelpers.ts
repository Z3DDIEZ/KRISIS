import { DataRecord, ExportOptions } from '../types/dataManagement'

/**
 * Escapes CSV fields according to RFC 4180
 * Handles commas, quotes, and newlines
 */
function escapeCsvField(field: string | number | boolean): string {
  const stringField = String(field)

  // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n') || stringField.includes('\r')) {
    return '"' + stringField.replace(/"/g, '""') + '"'
  }

  return stringField
}

/**
 * Converts application data to CSV format
 */
export function applicationsToCsv(applications: DataRecord[], options: ExportOptions = {}): string {
  const {
    includeHeaders = true
  } = options

  const headers = ['Company', 'Role', 'Date Applied', 'Status', 'Visa Sponsorship', 'Notes']
  const rows: string[] = []

  // Add headers if requested
  if (includeHeaders) {
    rows.push(headers.map(escapeCsvField).join(','))
  }

  // Add data rows
  applications.forEach(app => {
    const row = [
      app.company,
      app.role,
      app.dateApplied, // Keep as YYYY-MM-DD for consistency
      app.status,
      app.visaSponsorship ? 'Yes' : 'No',
      app.notes || ''
    ]

    rows.push(row.map(escapeCsvField).join(','))
  })

  return rows.join('\n')
}

/**
 * Downloads CSV data as a file
 */
export function downloadCsv(csvContent: string, filename: string = 'applications.csv'): void {
  // Add UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF'
  const csvWithBOM = BOM + csvContent

  // Create blob and download
  const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Cleanup blob URL after download
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

/**
 * Exports applications to CSV file
 */
export function exportApplicationsToCsv(
  applications: DataRecord[],
  options: ExportOptions = {}
): boolean {
  if (!applications || applications.length === 0) {
    alert('No data to export. Please add some applications first.')
    return false
  }

  try {
    const csvContent = applicationsToCsv(applications, options)
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = options.filename || `krisis-applications-${timestamp}.csv`

    downloadCsv(csvContent, filename)
    return true
  } catch (error) {
    console.error('Error exporting CSV:', error)
    alert('Failed to export data. Please try again.')
    return false
  }
}

/**
 * Exports a Recharts chart to PNG
 */
export function exportChartToPng(chartRef: React.RefObject<unknown>, filename: string = 'chart.png'): boolean {
  if (!chartRef.current) {
    console.error('Chart ref not found')
    return false
  }

  try {
    // Find the SVG element within the Recharts component
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const current = chartRef.current as any
    const container = current.container || current
    const svgElement = container.querySelector('svg')

    if (!svgElement) {
      console.error('SVG element not found in chart')
      return false
    }

    // Create canvas and convert SVG to PNG
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    // Get SVG as data URL
    const svgData = new XMLSerializer().serializeToString(svgElement)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const svgUrl = URL.createObjectURL(svgBlob)

    img.onload = () => {
      try {
        // Set canvas size to match SVG
        const rect = svgElement.getBoundingClientRect()
        canvas.width = rect.width || svgElement.clientWidth || 800
        canvas.height = rect.height || svgElement.clientHeight || 600

        // Scale for high DPI displays
        const dpr = window.devicePixelRatio || 1
        canvas.width *= dpr
        canvas.height *= dpr
        ctx?.scale(dpr, dpr)

        // Clear canvas with white background
        if (ctx) {
          ctx.fillStyle = 'white'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        }

        // Draw image to canvas
        ctx?.drawImage(img, 0, 0)

        // Convert to PNG and download
        const pngUrl = canvas.toDataURL('image/png')
        const link = document.createElement('a')
        link.download = filename
        link.href = pngUrl
        link.click()

      } catch (drawError) {
        console.error('Error drawing to canvas:', drawError)
      } finally {
        // Cleanup
        URL.revokeObjectURL(svgUrl)
      }
    }

    img.onerror = () => {
      console.error('Failed to load SVG image')
      URL.revokeObjectURL(svgUrl)
    }

    img.src = svgUrl
    return true
  } catch (error) {
    console.error('Error exporting chart:', error)
    return false
  }
}