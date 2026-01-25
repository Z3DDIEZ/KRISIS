import { DataRecord } from '../types/dataManagement'

// Company pool with visa sponsorship info
const COMPANIES = [
  // FAANG + Big Tech (all sponsor visas)
  { name: 'Google', visaSponsorship: true },
  { name: 'Microsoft', visaSponsorship: true },
  { name: 'Amazon', visaSponsorship: true },
  { name: 'Meta', visaSponsorship: true },
  { name: 'Apple', visaSponsorship: true },
  { name: 'Netflix', visaSponsorship: true },

  // Mid-size tech companies
  { name: 'Stripe', visaSponsorship: true },
  { name: 'Square', visaSponsorship: true },
  { name: 'Shopify', visaSponsorship: true },
  { name: 'Slack', visaSponsorship: true },
  { name: 'Zoom', visaSponsorship: true },
  { name: 'Atlassian', visaSponsorship: true },
  { name: 'Dropbox', visaSponsorship: true },
  { name: 'Box', visaSponsorship: true },
  { name: 'Snowflake', visaSponsorship: true },
  { name: 'Databricks', visaSponsorship: true },
  { name: 'Confluent', visaSponsorship: true },
  { name: 'MongoDB', visaSponsorship: true },
  { name: 'Elastic', visaSponsorship: true },
  { name: 'Docker', visaSponsorship: true },
  { name: 'HashiCorp', visaSponsorship: true },
  { name: 'Datadog', visaSponsorship: true },
  { name: 'New Relic', visaSponsorship: true },

  // Startups and smaller companies (mixed visa sponsorship)
  { name: 'Airbnb', visaSponsorship: false },
  { name: 'Uber', visaSponsorship: false },
  { name: 'Lyft', visaSponsorship: false },
  { name: 'PayPal', visaSponsorship: false },
  { name: 'LinkedIn', visaSponsorship: true },
  { name: 'Twitter', visaSponsorship: false },
  { name: 'Salesforce', visaSponsorship: true },
  { name: 'Oracle', visaSponsorship: true },
  { name: 'Adobe', visaSponsorship: true }
]

// Role variations
const ROLES = [
  'Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'DevOps Engineer',
  'Data Engineer',
  'Machine Learning Engineer',
  'Site Reliability Engineer',
  'Platform Engineer',
  'Cloud Engineer',
  'Senior Software Engineer',
  'Staff Engineer',
  'Principal Engineer',
  'Engineering Manager',
  'Technical Lead'
]

// Status distribution for 30 applications
const STATUS_DISTRIBUTION: Array<{ status: DataRecord['status']; count: number }> = [
  { status: 'Applied', count: 12 },          // 40%
  { status: 'Phone Screen', count: 8 },      // 25%
  { status: 'Technical Interview', count: 4 }, // 15%
  { status: 'Final Round', count: 3 },       // 10%
  { status: 'Offer', count: 2 },             // 5%
  { status: 'Rejected', count: 1 }           // 5%
]

// Sample notes for applications
const SAMPLE_NOTES = [
  'Excited about this opportunity! Strong focus on machine learning.',
  'Great company culture and innovative products.',
  'Competitive salary and excellent benefits package.',
  'Looking forward to working with cutting-edge technology.',
  'Impressed by the company\'s mission and values.',
  'Strong technical team and collaborative environment.',
  'Opportunity to work on large-scale systems.',
  'Good work-life balance and remote work options.',
  'Exciting projects and room for growth.',
  'Aligns well with my career goals and interests.',
  'Competitive compensation and equity package.',
  'Great location and office amenities.',
  'Strong leadership and company direction.',
  'Opportunity to learn new technologies.',
  'Positive interview experience with the team.'
]

/**
 * Gets appropriate status based on application age
 */
function getStatusForAge(daysSinceApplied: number): DataRecord['status'] {
  if (daysSinceApplied < 7) {
    return 'Applied' // All recent applications are still applied
  } else if (daysSinceApplied < 14) {
    // 70% still applied, 30% moved to phone screen
    return Math.random() < 0.7 ? 'Applied' : 'Phone Screen'
  } else if (daysSinceApplied < 21) {
    // 50% applied, 25% phone screen, 25% technical
    const rand = Math.random()
    if (rand < 0.5) return 'Applied'
    if (rand < 0.75) return 'Phone Screen'
    return 'Technical Interview'
  } else if (daysSinceApplied < 30) {
    // 40% technical, 20% final, 30% rejected, 10% offer
    const rand = Math.random()
    if (rand < 0.4) return 'Technical Interview'
    if (rand < 0.6) return 'Final Round'
    if (rand < 0.9) return 'Rejected'
    return 'Offer'
  } else {
    // 70% rejected, 20% technical/final, 10% offer
    const rand = Math.random()
    if (rand < 0.7) return 'Rejected'
    if (rand < 0.9) return Math.random() < 0.5 ? 'Technical Interview' : 'Final Round'
    return 'Offer'
  }
}

/**
 * Generates a random date within the last 60 days
 */
function getRandomDate(): { dateString: string; daysAgo: number } {
  const now = new Date()
  const daysAgo = Math.floor(Math.random() * 60) // 0-59 days ago
  const date = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000))

  return {
    dateString: date.toISOString().split('T')[0], // YYYY-MM-DD
    daysAgo
  }
}

/**
 * Generates realistic demo data for analytics testing
 */
export function generateDemoData(): DataRecord[] {
  const applications: DataRecord[] = []

  // Generate applications with status distribution
  STATUS_DISTRIBUTION.forEach(({ status, count }) => {
    for (let i = 0; i < count; i++) {
      const { dateString, daysAgo } = getRandomDate()
      const company = COMPANIES[Math.floor(Math.random() * COMPANIES.length)]
      const role = ROLES[Math.floor(Math.random() * ROLES.length)]

      // For older applications, use age-based status logic
      // For distribution-based, override with the target status
      const finalStatus = status

      // Add some notes for ~30% of applications
      const notes = Math.random() < 0.3
        ? SAMPLE_NOTES[Math.floor(Math.random() * SAMPLE_NOTES.length)]
        : undefined

      const application: DataRecord = {
        id: `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        company: company.name,
        role,
        dateApplied: dateString,
        status: finalStatus,
        visaSponsorship: company.visaSponsorship,
        notes
      }

      applications.push(application)
    }
  })

  // Sort by date (most recent first)
  return applications.sort((a, b) => new Date(b.dateApplied).getTime() - new Date(a.dateApplied).getTime())
}

/**
 * Validates that generated demo data meets requirements
 */
export function validateDemoData(applications: DataRecord[]): boolean {
  if (applications.length !== 30) return false

  // Check status distribution
  const statusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const expectedCounts = STATUS_DISTRIBUTION.reduce((acc, { status, count }) => {
    acc[status] = count
    return acc
  }, {} as Record<string, number>)

  for (const [status, expectedCount] of Object.entries(expectedCounts)) {
    if (statusCounts[status] !== expectedCount) return false
  }

  // Check date range (should be within last 60 days)
  const now = new Date()
  const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000))

  for (const app of applications) {
    const appDate = new Date(app.dateApplied)
    if (appDate < sixtyDaysAgo || appDate > now) return false
  }

  // Check that all required fields are present
  for (const app of applications) {
    if (!app.id || !app.company || !app.role || !app.dateApplied || !app.status) {
      return false
    }
    // Check that visaSponsorship is boolean
    if (typeof app.visaSponsorship !== 'boolean') {
      return false
    }
  }

  return true
}