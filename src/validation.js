/**
 * Form Validation Utilities
 * All validation messages use i18n keys for easy translation
 */

import { getUITranslations } from './i18n.js';

/**
 * Validate an email address
 * @param {string} email 
 * @returns {boolean}
 */
export function isValidEmail(email) {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

/**
 * Validate a phone number (flexible format)
 * @param {string} phone 
 * @returns {boolean}
 */
export function isValidPhone(phone) {
    if (!phone) return true; // Phone is often optional
    // Allow various formats: +49 123 456789, 0123-456789, etc.
    const phoneRegex = /^[\d\s\-+().]{6,20}$/;
    return phoneRegex.test(phone.trim());
}

/**
 * Validate a URL
 * @param {string} url 
 * @returns {boolean}
 */
export function isValidUrl(url) {
    if (!url) return true; // URL is often optional
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Check if a string is not empty
 * @param {string} value 
 * @returns {boolean}
 */
export function isNotEmpty(value) {
    return value && value.trim().length > 0;
}

/**
 * Check minimum length
 * @param {string} value 
 * @param {number} minLength 
 * @returns {boolean}
 */
export function hasMinLength(value, minLength) {
    return value && value.length >= minLength;
}

/**
 * Validate a form field and show error
 * @param {HTMLInputElement} input - The input element
 * @param {string} validationType - Type of validation: 'required', 'email', 'phone', 'url', 'minLength'
 * @param {object} options - Additional options like minLength value
 * @param {object} ui - UI translations object
 * @returns {boolean} - Whether the field is valid
 */
export function validateField(input, validationType, options = {}, ui = null) {
    if (!input) return true;
    
    const value = input.value;
    let isValid = true;
    let errorMessage = '';
    
    // Get translations if not provided
    if (!ui) {
        ui = getUITranslations('en');
    }
    
    switch (validationType) {
        case 'required':
            isValid = isNotEmpty(value);
            errorMessage = ui.validation_required;
            break;
        case 'email':
            if (isNotEmpty(value)) {
                isValid = isValidEmail(value);
                errorMessage = ui.validation_email_invalid;
            }
            break;
        case 'phone':
            if (isNotEmpty(value)) {
                isValid = isValidPhone(value);
                errorMessage = ui.validation_phone_invalid;
            }
            break;
        case 'url':
            if (isNotEmpty(value)) {
                isValid = isValidUrl(value);
                errorMessage = ui.validation_url_invalid;
            }
            break;
        case 'minLength':
            const minLen = options.minLength || 8;
            if (isNotEmpty(value)) {
                isValid = hasMinLength(value, minLen);
                errorMessage = ui.validation_password_min;
            }
            break;
        case 'match':
            const matchValue = options.matchValue || '';
            isValid = value === matchValue;
            errorMessage = ui.validation_passwords_mismatch;
            break;
    }
    
    // Update UI
    if (isValid) {
        clearFieldError(input);
    } else {
        showFieldError(input, errorMessage);
    }
    
    return isValid;
}

/**
 * Show error state on a field
 * @param {HTMLInputElement} input 
 * @param {string} message 
 */
export function showFieldError(input, message) {
    if (!input) return;
    
    input.classList.add('error');
    
    // Remove existing error message
    const existingError = input.parentNode.querySelector('.form-error');
    if (existingError) {
        existingError.remove();
    }
    
    // Add error message
    const errorEl = document.createElement('p');
    errorEl.className = 'form-error';
    errorEl.textContent = message;
    input.parentNode.appendChild(errorEl);
}

/**
 * Clear error state on a field
 * @param {HTMLInputElement} input 
 */
export function clearFieldError(input) {
    if (!input) return;
    
    input.classList.remove('error');
    
    const existingError = input.parentNode.querySelector('.form-error');
    if (existingError) {
        existingError.remove();
    }
}

/**
 * Validate multiple fields at once
 * @param {Array} fields - Array of {input, type, options} objects
 * @param {object} ui - UI translations
 * @returns {boolean} - Whether all fields are valid
 */
export function validateForm(fields, ui = null) {
    let allValid = true;
    
    for (const field of fields) {
        const isValid = validateField(field.input, field.type, field.options || {}, ui);
        if (!isValid) {
            allValid = false;
        }
    }
    
    return allValid;
}

/**
 * Add real-time validation to an input
 * @param {HTMLInputElement} input 
 * @param {string} validationType 
 * @param {object} options 
 * @param {object} ui 
 */
export function addRealtimeValidation(input, validationType, options = {}, ui = null) {
    if (!input) return;
    
    input.addEventListener('blur', () => {
        validateField(input, validationType, options, ui);
    });
    
    input.addEventListener('input', () => {
        // Clear error on input (will revalidate on blur)
        if (input.classList.contains('error')) {
            clearFieldError(input);
        }
    });
}

export default {
    isValidEmail,
    isValidPhone,
    isValidUrl,
    isNotEmpty,
    hasMinLength,
    validateField,
    showFieldError,
    clearFieldError,
    validateForm,
    addRealtimeValidation,
};
