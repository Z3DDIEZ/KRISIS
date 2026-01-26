import { toast } from 'sonner';

/**
 * Standardized error mapping for KRISIS
 * Adopts H2U pattern for user-friendly status-based messaging
 */
export const ERROR_MESSAGES: Record<string | number, string> = {
    400: 'Refusal Protocol: Invalid request structure detected.',
    401: 'Access Denied: Intelligence session expired. Re-authentication required.',
    403: 'Permission Error: Data segment restricted for current authorization.',
    404: 'Missing Record: Requested application node not found.',
    408: 'Latency Overload: Server taking too long to respond.',
    429: 'Rate Limit: Too many requests. Cool down period active.',
    500: 'Core Failure: Internal architecture error detected.',
    503: 'Tactical Downtime: System is currently under maintenance.',
    'default': 'Unknown Variable: An unexpected error occurred in the execution layer.',
    'network-error': 'Signal Loss: Unable to reach the central data cluster.'
};

export const handleError = (error: any, context?: string) => {
    console.error(`[KRISIS ${context || 'Core'}] Error:`, error);

    let status = error?.status || error?.code;
    let message = ERROR_MESSAGES[status] || ERROR_MESSAGES['default'];

    if (error?.message?.includes('Network Error')) {
        message = ERROR_MESSAGES['network-error'];
    }

    toast.error(message, {
        description: error?.message || 'Check logs for trace details.',
        duration: 5000
    });

    return { status, message };
};

export const getErrorMessage = (status: number | string) => {
    return ERROR_MESSAGES[status] || ERROR_MESSAGES['default'];
};
