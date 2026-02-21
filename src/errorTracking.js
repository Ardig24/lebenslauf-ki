/**
 * Error Tracking Module
 * Lightweight error tracking that can be extended with Sentry or similar
 */

// Configuration
const CONFIG = {
    enabled: true,
    logToConsole: true,
    // Set to your Sentry DSN when ready to use Sentry
    sentryDsn: null,
};

// Error queue for batch sending (if needed)
const errorQueue = [];

/**
 * Initialize error tracking
 * Call this once when the app starts
 */
export function initErrorTracking() {
    if (!CONFIG.enabled) return;

    // Global error handler
    window.onerror = function(message, source, lineno, colno, error) {
        trackError({
            type: 'uncaught',
            message,
            source,
            lineno,
            colno,
            stack: error?.stack,
        });
        return false; // Don't suppress the error
    };

    // Unhandled promise rejection handler
    window.onunhandledrejection = function(event) {
        trackError({
            type: 'unhandledrejection',
            message: event.reason?.message || String(event.reason),
            stack: event.reason?.stack,
        });
    };

    console.log('🔍 Error tracking initialized');
}

/**
 * Track an error
 * @param {object} errorData - Error information
 */
export function trackError(errorData) {
    if (!CONFIG.enabled) return;

    const enrichedError = {
        ...errorData,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        // Add user context if available
        userId: getUserId(),
    };

    if (CONFIG.logToConsole) {
        console.error('📊 Tracked Error:', enrichedError);
    }

    // Add to queue
    errorQueue.push(enrichedError);

    // If Sentry is configured, send to Sentry
    if (CONFIG.sentryDsn && window.Sentry) {
        window.Sentry.captureException(new Error(errorData.message), {
            extra: enrichedError,
        });
    }

    // Keep queue manageable
    if (errorQueue.length > 100) {
        errorQueue.shift();
    }
}

/**
 * Track a custom event/action
 * @param {string} eventName - Name of the event
 * @param {object} data - Additional data
 */
export function trackEvent(eventName, data = {}) {
    if (!CONFIG.enabled) return;

    const event = {
        type: 'event',
        name: eventName,
        data,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userId: getUserId(),
    };

    if (CONFIG.logToConsole) {
        console.log('📊 Tracked Event:', event);
    }

    // If Sentry is configured
    if (CONFIG.sentryDsn && window.Sentry) {
        window.Sentry.addBreadcrumb({
            category: 'user-action',
            message: eventName,
            data,
            level: 'info',
        });
    }
}

/**
 * Set user context for error tracking
 * @param {object} user - User information
 */
export function setUserContext(user) {
    if (!CONFIG.enabled || !user) return;

    // Store user ID for error context
    try {
        sessionStorage.setItem('errorTracking_userId', user.id || 'anonymous');
    } catch (e) {
        // Ignore storage errors
    }

    // If Sentry is configured
    if (CONFIG.sentryDsn && window.Sentry) {
        window.Sentry.setUser({
            id: user.id,
            email: user.email,
        });
    }
}

/**
 * Get stored user ID
 */
function getUserId() {
    try {
        return sessionStorage.getItem('errorTracking_userId') || 'anonymous';
    } catch (e) {
        return 'anonymous';
    }
}

/**
 * Get all tracked errors (for debugging)
 */
export function getErrorQueue() {
    return [...errorQueue];
}

/**
 * Clear error queue
 */
export function clearErrorQueue() {
    errorQueue.length = 0;
}

export default {
    initErrorTracking,
    trackError,
    trackEvent,
    setUserContext,
    getErrorQueue,
    clearErrorQueue,
};
