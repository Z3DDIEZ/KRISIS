import Papa from 'papaparse'
import { DataRecord, ImportResult, ImportError, ImportProgress } from '../types/dataManagement'

// Status normalization mappings
const STATUS_MAPPINGS: Record<string, DataRecord['status']> = {
  // Applied variations
  'applied': 'Applied',
  'application': 'Applied',
  'submitted': 'Applied',
  'sent': 'Applied',

  // Phone Screen variations
  'phone screen': 'Phone Screen',
  'phonescreen': 'Phone Screen',
  'phone': 'Phone Screen',
  'screening': 'Phone Screen',
  'screen': 'Phone Screen',
  'call': 'Phone Screen',
  'interview call': 'Phone Screen',

  // Technical Interview variations
  'technical interview': 'Technical Interview',
  'technical': 'Technical Interview',
  'tech interview': 'Technical Interview',
  'coding interview': 'Technical Interview',
  'tech screen': 'Technical Interview',
  'technical screen': 'Technical Interview',

  // Final Round variations
  'final round': 'Final Round',
  'final': 'Final Round',
  'final interview': 'Final Round',
  'onsite': 'Final Round',
  'on-site': 'Final Round',
  'in-person': 'Final Round',
  'office': 'Final Round',

  // Offer variations
  'offer': 'Offer',
  'offered': 'Offer',
  'accepted': 'Offer',
  'hired': 'Offer',

  // Rejected variations
  'rejected': 'Rejected',
  'declined': 'Rejected',
  'denied': 'Rejected',
  'no': 'Rejected',
  'failed': 'Rejected'
}

// Companies that typically sponsor visas (for fallback when visa sponsorship not specified)
const VISA_SPONSOR_COMPANIES = new Set([
  'google', 'microsoft', 'amazon', 'meta', 'apple', 'netflix',
  'linkedin', 'twitter', 'x', 'salesforce', 'oracle', 'adobe',
  'uber', 'lyft', 'airbnb', 'stripe', 'square', 'paypal',
  'shopify', 'slack', 'zoom', 'atlassian', 'dropbox', 'box',
  'snowflake', 'databricks', 'confluent', 'mongodb', 'elastic',
  'docker', 'kubernetes', 'hashicorp', 'datadog', 'new relic'
])

/**
 * Normalizes header names to handle variations
 */
function normalizeHeader(header: string): string {
  const normalized = header.toLowerCase().trim().replace(/[^a-z0-9]/g, '')

  // Handle common variations
  const headerMappings: Record<string, string> = {
    'companyname': 'company',
    'company_name': 'company',
    'employer': 'company',
    'organization': 'company',
    'firm': 'company',
    'rolename': 'role',
    'role_name': 'role',
    'position': 'role',
    'job': 'role',
    'title': 'role',
    'jobtitle': 'role',
    'dateapplied': 'dateApplied',
    'date_applied': 'dateApplied',
    'applied_date': 'dateApplied',
    'application_date': 'dateApplied',
    'submitted_date': 'dateApplied',
    'date': 'dateApplied',
    'statusname': 'status',
    'application_status': 'status',
    'current_status': 'status',
    'state': 'status',
    'visasponsorship': 'visaSponsorship',
    'visa_sponsorship': 'visaSponsorship',
    'visa': 'visaSponsorship',
    'sponsor': 'visaSponsorship',
    'h1b': 'visaSponsorship',
    'workpermit': 'visaSponsorship',
    'timestamp': 'timestamp',
    'created': 'timestamp',
    'created_at': 'timestamp',
    'date_created': 'timestamp',
    'notes': 'notes',
    'comments': 'notes',
    'description': 'notes',
    'additional_info': 'notes'
  }

  return headerMappings[normalized] || normalized
}

/**
 * Parses and validates a date string
 */
function parseDate(dateStr: string): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null

  const trimmed = dateStr.trim()

  // Try different date formats
  const formats = [
    // YYYY-MM-DD (ISO)
    /^(\d{4})-(\d{2})-(\d{2})$/,
    // MM/DD/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // DD/MM/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // MM-DD-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    // DD-MM-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/
  ]

  for (const format of formats) {
    const match = trimmed.match(format)
    if (match) {
      let year: number, month: number, day: number

      if (format === formats[0]) {
        // YYYY-MM-DD
        [, year, month, day] = match.map(Number)
      } else if (format === formats[1]) {
        // MM/DD/YYYY (ambiguous, assume US format)
        [, month, day, year] = match.map(Number)
      } else if (format === formats[2] || format === formats[3] || format === formats[4]) {
        // DD/MM/YYYY or DD-MM-YYYY (ambiguous, assume DD/MM/YYYY)
        [, day, month, year] = match.map(Number)
      } else {
        continue
      }

      // Validate date
      const date = new Date(year, month - 1, day)
      if (date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day) {
        // Return in YYYY-MM-DD format
        return date.toISOString().split('T')[0]
      }
    }
  }

  return null
}

/**
 * Normalizes status string
 */
function normalizeStatus(status: string): DataRecord['status'] | null {
  if (!status || typeof status !== 'string') return null

  const normalized = status.toLowerCase().trim()
  return STATUS_MAPPINGS[normalized] || null
}

/**
 * Parses boolean values from various string representations
 */
function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value !== 'string') return Boolean(value)

  const normalized = value.toLowerCase().trim()
  return ['true', 'yes', 'y', '1', 'checked', 'on', 'enabled'].includes(normalized)
}

/**
 * Validates a single data record
 */
function validateRecord(record: Record<string, unknown>, rowNumber: number): { record: DataRecord | null; errors: ImportError[] } {
  const errors: ImportError[] = []

  // Validate required fields
  if (!record.company || typeof record.company !== 'string') {
    errors.push({
      row: rowNumber,
      field: 'company',
      message: 'Company is required',
      data: record.company
    })
  } else if (record.company.length > 100) {
    errors.push({
      row: rowNumber,
      field: 'company',
      message: 'Company name must be less than 100 characters',
      data: record.company
    })
  }

  if (!record.role || typeof record.role !== 'string') {
    errors.push({
      row: rowNumber,
      field: 'role',
      message: 'Role is required',
      data: record.role
    })
  } else if (record.role.length > 100) {
    errors.push({
      row: rowNumber,
      field: 'role',
      message: 'Role must be less than 100 characters',
      data: record.role
    })
  }

  // Validate date
  const parsedDate = parseDate(String(record.dateApplied))
  if (!parsedDate) {
    errors.push({
      row: rowNumber,
      field: 'dateApplied',
      message: 'Invalid date format. Use YYYY-MM-DD, MM/DD/YYYY, or DD/MM/YYYY',
      data: record.dateApplied
    })
  }

  // Validate status
  const normalizedStatus = normalizeStatus(String(record.status))
  if (!normalizedStatus) {
    errors.push({
      row: rowNumber,
      field: 'status',
      message: 'Invalid status. Must be one of: Applied, Phone Screen, Technical Interview, Final Round, Offer, Rejected',
      data: record.status
    })
  }

  // If there are errors, don't create the record
  if (errors.length > 0) {
    return { record: null, errors }
  }

  // Create the record - only include fields that have values
  const dataRecord: Partial<DataRecord> = {
    id: record.id || `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    company: String(record.company).trim(),
    role: String(record.role).trim(),
    dateApplied: parsedDate!,
    status: normalizedStatus!,
    visaSponsorship: parseBoolean(record.visaSponsorship) ||
      VISA_SPONSOR_COMPANIES.has(String(record.company).toLowerCase().trim())
  } as DataRecord

  // Only include optional fields if they have values
  if (record.notes && String(record.notes).trim()) {
    dataRecord.notes = String(record.notes).trim()
  }

  if (record.resumeUrl && String(record.resumeUrl).trim()) {
    dataRecord.resumeUrl = String(record.resumeUrl).trim()
  }

  return { record: dataRecord as DataRecord, errors: [] }
}

/**
 * Imports CSV data from a file
 */
export function importCsvFromFile(
  file: File,
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    // Validate file
    if (!file.name.toLowerCase().endsWith('.csv')) {
      reject(new Error('Please select a CSV file'))
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      reject(new Error('File size must be less than 5MB'))
      return
    }

    const imported: DataRecord[] = []
    const errors: ImportError[] = []
    let skipped = 0
    let rowsProcessed = 0

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeHeader,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      step: (results: any, parser: any) => {
        rowsProcessed++

        // Validate and process each row
        const { record, errors: rowErrors } = validateRecord(results.data as Record<string, unknown>, rowsProcessed)

        if (rowErrors.length > 0) {
          errors.push(...rowErrors)
          skipped++
        } else if (record) {
          imported.push(record)
        }

        // Update progress every 10 rows
        if (rowsProcessed % 10 === 0 && onProgress) {
          onProgress({
            loaded: parser.streamer?._input?.size || file.size,
            total: file.size,
            rowsProcessed,
            errors: errors.length
          })
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      complete: (results: any) => {
        // Handle parse errors
        if (results.errors.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          results.errors.forEach((error: any) => {
            errors.push({
              row: error.row || 0,
              message: `Parse error: ${error.message}`,
              data: error
            })
          })
        }

        const success = errors.length === 0 || imported.length > 0

        resolve({
          success,
          imported,
          errors,
          skipped
        })
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: (error: any) => {
        reject(new Error(`Failed to parse CSV: ${error.message}`))
      }
    })
  })
}

/**
 * Validates CSV file before import
 */
export function validateCsvFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file selected' }
  }

  if (!file.name.toLowerCase().endsWith('.csv')) {
    return { valid: false, error: 'File must be a CSV file' }
  }

  if (file.size > 5 * 1024 * 1024) {
    return { valid: false, error: 'File size must be less than 5MB' }
  }

  if (file.size === 0) {
    return { valid: false, error: 'File is empty' }
  }

  return { valid: true }
}