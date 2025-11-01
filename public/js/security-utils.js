// security-utils.js - Comprehensive security utilities

const SecurityUtils = {
    /**
     * Escape HTML special characters
     */
    escapeHtml: function(text) {
        if (text == null) return '';
        if (typeof text !== 'string') return String(text);

        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/\//g, '&#x2F;');
    },

    /**
     * Escape for HTML attributes
     */
    escapeAttr: function(value) {
        return this.escapeHtml(value).replace(/"/g, '&quot;');
    },

    /**
     * Escape for CSS
     */
    escapeCss: function(value) {
        if (typeof value !== 'string') return '';
        return value.replace(/[\\'"{}()]/g, '\\$&');
    },

    /**
     * Escape for JavaScript strings
     */
    escapeJs: function(value) {
        if (typeof value !== 'string') return '';
        return value
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
    },

    /**
     * Safely set innerHTML
     */
    setSafeHTML: function(element, html) {
        if (!element || !element.innerHTML) return;
        element.innerHTML = this.escapeHtml(html);
    },

    /**
     * Safely create HTML element from string
     */
    createSafeElement: function(html) {
        const div = document.createElement('div');
        div.textContent = html; // This automatically escapes
        return div.innerHTML;
    },

    /**
     * Sanitize URL (basic check)
     */
    sanitizeUrl: function(url) {
        if (typeof url !== 'string') return '';

        // Allow only http, https, and relative URLs
        if (url.startsWith('http://') ||
            url.startsWith('https://') ||
            url.startsWith('/') ||
            url.startsWith('#') ||
            url.startsWith('mailto:') ||
            url.startsWith('tel:')) {
            return url;
        }

        return ''; // Block suspicious URLs
    },

    /**
     * Validate and sanitize user input
     */
    sanitizeInput: function(input, options = {}) {
        if (typeof input !== 'string') return '';

        let sanitized = input.trim();

        // Remove script tags and event handlers
        sanitized = sanitized
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/on\w+="[^"]*"/gi, '')
            .replace(/on\w+='[^']*'/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/vbscript:/gi, '');

        // Limit length if specified
        if (options.maxLength && sanitized.length > options.maxLength) {
            sanitized = sanitized.substring(0, options.maxLength);
        }

        return sanitized;
    },

    /**
     * Safe string interpolation
     */
    safeFormat: function(template, ...args) {
        return template.replace(/{(\d+)}/g, function(match, number) {
            return typeof args[number] !== 'undefined'
                ? SecurityUtils.escapeHtml(args[number])
                : match;
        });
    }
};

// Make it available globally
window.SecurityUtils = SecurityUtils;

// Usage examples:
/*
// 1. Escape user input before displaying
const userInput = '<script>alert("XSS")</script>Hello';
document.getElementById('output').innerHTML = SecurityUtils.escapeHtml(userInput);

// 2. Safe attribute setting
const userUrl = 'javascript:alert("XSS")';
const safeUrl = SecurityUtils.sanitizeUrl(userUrl);
element.setAttribute('href', safeUrl);

// 3. Safe string formatting
const message = SecurityUtils.safeFormat('Hello {0}, you have {1} messages', userName, count);
*/


//Quick Reference - Common Use Cases:

/*
// 1. Setting innerHTML safely
element.innerHTML = SecurityUtils.escapeHtml(userContent);

// 2. Setting attributes safely
element.setAttribute('href', SecurityUtils.sanitizeUrl(userUrl));

// 3. Sanitizing form input
const safeInput = SecurityUtils.sanitizeInput(rawInput, { maxLength: 100 });

// 4. Safe string formatting
const message = SecurityUtils.safeFormat('Hello {0}', userName);

// 5. Creating safe HTML templates
const html = SecurityUtils.safeFormat(
    '<div class="{0}"><h2>{1}</h2><p>{2}</p></div>',
    cssClass, title, content
);


 */