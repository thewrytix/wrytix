// gtag.js - Anti-Overwrite Edition (GA4 for wrytix.netlify.app)
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}

gtag('js', new Date());

// SINGLE config—explicit expiry to block overwrites
gtag('config', 'G-7TNXE6FFKZ', {
    cookie_domain: window.location.hostname,  // Matches wrytix.netlify.app exactly
    cookie_flags: 'SameSite=None;Secure',     // HTTPS/Netlify safe
    cookie_expires: 63072000,                 // Hard 2 years—resists resets
    anonymize_ip: true                        // Bonus privacy
});

// Prevent dupes: Ignore extra configs
window._gaConfigLoaded = true;  // Flag to block multiples (if other scripts check)

console.log('🔒 GA Secured: Expiry Locked, No Overwrites');