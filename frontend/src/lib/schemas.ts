import { z } from 'zod';

export const applicationSchema = z.object({
    company: z.string().min(1, 'Target Entity Required').max(100).trim(),
    role: z.string().min(1, 'Role Required').max(100).trim(),
    status: z.string().min(1, 'Status Required'),
    dateApplied: z.string().min(1, 'Timestamp Required'),
    notes: z.string().max(1000),
    visaSponsorship: z.boolean(),
    requestAnalysis: z.boolean(),
    resumeUrl: z.string(),
});

export type ApplicationValues = z.infer<typeof applicationSchema>;
