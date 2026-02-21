/**
 * Toast Notification System
 * Provides user feedback with i18n support
 */

// Toast types
export const TOAST_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
};

// Toast container reference
let toastContainer = null;

// Default duration in ms
const DEFAULT_DURATION = 4000;

/**
 * Initialize the toast system - creates container if not exists
 */
export function initToast() {
    if (toastContainer) return;
    
    toastContainer = document.getElementById('toast-container');
    
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
}

/**
 * Show a toast notification
 * @param {string} message - The message to display (already translated)
 * @param {string} type - Toast type: success, error, warning, info
 * @param {number} duration - Duration in ms (0 = persistent)
 */
export function showToast(message, type = TOAST_TYPES.INFO, duration = DEFAULT_DURATION) {
    initToast();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = getToastIcon(type);
    
    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-message">${escapeHtml(message)}</div>
        <button class="toast-close" aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;
    
    // Close button handler
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => removeToast(toast));
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('toast-visible');
    });
    
    // Auto-remove after duration
    if (duration > 0) {
        setTimeout(() => removeToast(toast), duration);
    }
    
    return toast;
}

/**
 * Remove a toast with animation
 */
function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    
    toast.classList.remove('toast-visible');
    toast.classList.add('toast-hiding');
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

/**
 * Get icon SVG for toast type
 */
function getToastIcon(type) {
    switch (type) {
        case TOAST_TYPES.SUCCESS:
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>`;
        case TOAST_TYPES.ERROR:
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>`;
        case TOAST_TYPES.WARNING:
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>`;
        case TOAST_TYPES.INFO:
        default:
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>`;
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Convenience methods
export const toast = {
    success: (message, duration) => showToast(message, TOAST_TYPES.SUCCESS, duration),
    error: (message, duration) => showToast(message, TOAST_TYPES.ERROR, duration),
    warning: (message, duration) => showToast(message, TOAST_TYPES.WARNING, duration),
    info: (message, duration) => showToast(message, TOAST_TYPES.INFO, duration)
};

export default toast;
