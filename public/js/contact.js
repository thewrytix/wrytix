// js/contact.js
// API_BASE is defined globally in config.js – must be loaded before this script.

// Contact Form
const form = document.querySelector('.contact-form');
form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const formData = new FormData(form);
    const rawName = formData.get('name');
    const rawEmail = formData.get('email');
    const rawMessage = formData.get('message');

    // Sanitize inputs before sending
    const data = {
        name: SecurityUtils.sanitizeInput(rawName, { maxLength: 100 }),
        email: SecurityUtils.sanitizeInput(rawEmail, { maxLength: 100 }),
        message: SecurityUtils.sanitizeInput(rawMessage, { maxLength: 500 })
    };

    try {
        const response = await fetch(`${API_BASE}/contact`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (response.ok) {
            form.innerHTML = "<p style='color: green;'>Thank you! Your message has been sent successfully.</p>";
        } else {
            // Escape error message to prevent XSS
            const safeError = SecurityUtils.escapeHtml(result.error || 'Something went wrong. Please try again.');
            form.innerHTML = `<p style='color: red;'>${safeError}</p>`;
        }
    } catch (error) {
        console.error('Error:', error);
        form.innerHTML = "<p style='color: red;'>Network error. Please check your connection and try again.</p>";
    }

    window.loadSidebarAds({
        sliderId: 'mediaTrack',
        wrapperId: 'rotContainer',
        defaultCategory: 'contact'
    });
});

