import { z } from 'zod'

const statusSchema = z.enum([
  'Applied',
  'Phone Screen',
  'Technical Interview',
  'Final Round',
  'Offer',
  'Rejected',
])

const latestAnalysisSchema = z
  .object({
    fitScore: z.number().min(0).max(100).optional(),
    ghostingRisk: z.number().min(0).max(100).optional(),
    urgencyLevel: z.number().min(0).max(100).optional(),
    tacticalSignal: z.string().max(200).optional(),
    matchAnalysis: z.string().max(5000).optional(),
    keyMatches: z.array(z.string().max(100)).optional(),
    missingKeywords: z.array(z.string().max(100)).optional(),
    suggestedImprovements: z.array(z.string().max(200)).optional(),
    analyzedAt: z.string().optional(),
  })
  .optional()

export const applicationSchema = z.object({
  company: z.string().min(1, 'Target Entity Required').max(100).trim(),
  role: z.string().min(1, 'Role Required').max(100).trim(),
  status: statusSchema,
  dateApplied: z.string().min(1, 'Timestamp Required'),
  notes: z.string().max(1000),
  visaSponsorship: z.boolean(),
  requestAnalysis: z.boolean(),
  resumeUrl: z.string(),
  latestAnalysis: latestAnalysisSchema,
})

export const applicationRecordSchema = z.object({
  company: z.string().min(1).max(100).trim(),
  role: z.string().min(1).max(100).trim(),
  status: statusSchema.catch('Applied'),
  dateApplied: z.string().min(1),
  notes: z.string().max(1000).optional().default(''),
  visaSponsorship: z.boolean().optional().default(false),
  requestAnalysis: z.boolean().optional().default(false),
  resumeUrl: z.string().optional().default(''),
  latestAnalysis: latestAnalysisSchema,
})

export const parseApplicationRecord = (data: unknown) => applicationRecordSchema.safeParse(data)

export type ApplicationValues = z.infer<typeof applicationSchema>
