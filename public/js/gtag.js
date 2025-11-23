// gtag.js - GA4 Optimized for wrytix.netlify.app (No Overwrites, Valid Domain)
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}

gtag('js', new Date());

// SINGLE config call—explicitly fixes domain/expiry issues
gtag('config', 'G-7TNXE6FFKZ', {
    // Domain: Locks to your Netlify site (no 'business' or mismatches)
    cookie_domain: window.location.hostname,  // Dynamic: wrytix.netlify.app exactly
    // Flags: Secure HTTPS + cross-frame friendly (Netlify-safe)
    cookie_flags: 'SameSite=None;Secure',
    // Expires: Hard-set 2 years—prevents overwrites from dupe calls
    cookie_expires: 63072000,
    // Privacy boost (optional, but good for 2025 regs)
    anonymize_ip: true
});

// Temp debug: Remove after testing
console.log('✅ GA Loaded: Domain=' + window.location.hostname + ', Expires=Fixed');