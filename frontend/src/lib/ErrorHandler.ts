import { toast } from 'sonner';

/**
 * Standardized error mapping for KRISIS
 * Adopts H2U pattern for user-friendly status-based messaging
 */
export const ERROR_MESSAGES: Record<string | number, string> = {
    400: 'Invalid Request: Please check your input and try again.',
    401: 'Access Denied: Session expired. Please sign in again.',
    403: 'Permission Error: You do not have access to this resource.',
    404: 'Not Found: The requested application could not be found.',
    408: 'Request Timeout: Server took too long to respond.',
    429: 'Rate Limit: Too many requests. Please wait a moment.',
    500: 'Server Error: An internal error occurred.',
    503: 'Maintenance: System is currently under maintenance.',
    'default': 'Unknown Error: An unexpected error occurred.',
    'network-error': 'Connection Error: Unable to reach the server.'
};

/**
 * handleError - Maps unknown errors to user-friendly toasts.
 * @param error - Unknown error object from async or runtime failures.
 * @param context - Optional area label to aid debugging.
 * @returns The resolved status key and message shown to the user.
 */
export const handleError = (error: unknown, context?: string) => {
    console.error(`[KRISIS ${context || 'Core'}] Error:`, error);

    const err = error as { status?: number | string; code?: number | string; message?: string };
    const status = err?.status || err?.code || 'default';
    let message = ERROR_MESSAGES[status as string | number] || ERROR_MESSAGES['default'];

    if (err?.message?.includes('Network Error')) {
        message = ERROR_MESSAGES['network-error'];
    }

    toast.error(message, {
        description: (import.meta.env.DEV || import.meta.env.VITE_SHOW_ERROR_DETAILS === 'true')
          ? (err?.message || 'Check logs for trace details.')
          : undefined,
        duration: 5000
    });

    return { status, message };
};

/**
 * getErrorMessage - Retrieves a friendly message for a status code or key.
 * @param status - Status code or error key.
 * @returns A user-facing message string.
 */
export const getErrorMessage = (status: number | string) => {
    return ERROR_MESSAGES[status] || ERROR_MESSAGES['default'];
};
