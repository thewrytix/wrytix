//Contact-Form
const form = document.querySelector('.contact-form');
form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const formData = new FormData(form);

    // Sanitize all form inputs
    const data = {
        name: SecurityUtils.sanitizeInput(formData.get('name'), { maxLength: 100 }),
        email: SecurityUtils.sanitizeInput(formData.get('email'), { maxLength: 100 }),
        message: SecurityUtils.sanitizeInput(formData.get('message'), { maxLength: 1000 })
    };

    // Additional email validation
    if (!isValidEmail(data.email)) {
        showError('Please enter a valid email address');
        return;
    }

    // Validate required fields
    if (!data.name.trim() || !data.email.trim() || !data.message.trim()) {
        showError('All fields are required');
        return;
    }

    try {
        const response = await fetch('https://wrytix.onrender.com/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            // Use safe HTML setting
            SecurityUtils.setSafeHTML(form, "<p style='color: green;'>Thank you! Your message has been sent successfully.</p>");
        } else {
            // Safely display error message
            const errorMessage = SecurityUtils.escapeHtml(result.error || 'Something went wrong. Please try again.');
            form.innerHTML = `<p style='color: red;'>${errorMessage}</p>`;
        }
    } catch (error) {
        console.error('Error:', error);
        // Use safe HTML for error message
        SecurityUtils.setSafeHTML(form, "<p style='color: red;'>Network error. Please check your connection and try again.</p>");
    }
});

// Email validation function
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Error display function
function showError(message) {
    // Find or create error element
    let errorElement = form.querySelector('.form-error');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'form-error';
        form.insertBefore(errorElement, form.firstChild);
    }

    // Safely set error message
    SecurityUtils.setSafeHTML(errorElement, `<p style='color: red; margin-bottom: 15px;'>${message}</p>`);

    // Auto-remove error after 5 seconds
    setTimeout(() => {
        if (errorElement && errorElement.parentNode) {
            errorElement.remove();
        }
    }, 5000);
}

// Optional: Add real-time validation
function addRealTimeValidation() {
    const inputs = form.querySelectorAll('input, textarea');

    inputs.forEach(input => {
        input.addEventListener('input', function() {
            // Clear any existing errors when user starts typing
            const errorElement = form.querySelector('.form-error');
            if (errorElement) {
                errorElement.remove();
            }

            // Real-time email validation
            if (input.type === 'email' && input.value.trim()) {
                if (!isValidEmail(input.value)) {
                    input.style.borderColor = 'red';
                } else {
                    input.style.borderColor = '';
                }
            }
        });

        // Clear border on focus
        input.addEventListener('focus', function() {
            this.style.borderColor = '';
        });
    });
}

// Initialize real-time validation when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addRealTimeValidation);
} else {
    addRealTimeValidation();
}

// Ads Show
async function loadSidebarAds() {
    const articleCategory = document.querySelector("article")?.dataset.category || "contact";
    try {
        const res = await fetch("https://wrytix.onrender.com/ads");
        const ads = await res.json();
        const now = new Date();

        const filtered = ads.filter(ad =>
            ad.category === articleCategory &&
            ad.active &&
            new Date(ad.startDate) <= now &&
            new Date(ad.endDate) >= now
        );

        renderAdSlides(filtered);
    } catch (err) {
        document.getElementById("adSlider").innerHTML = "<p>⚠️ Failed to load ads.</p>";
        console.error(err);
    }
}

function renderAdSlides(ads) {
    const slider = document.getElementById("adSlider");
    slider.innerHTML = '';

    if (ads.length === 0) {
        slider.innerHTML = '<p>No ads to display.</p>';
        return;
    }

    ads.forEach(ad => {
        const slide = document.createElement("div");
        slide.className = "ad-slide";

        let content = '';
        if (ad.type === "image" && ad.file) {
            content = `<a href="${ad.link || '#'}" target="_blank"><img src="${ad.file}" alt="Ad Image"></a>`;
        } else if (ad.type === "video" && ad.file) {
            content = `<video src="${ad.file}" controls></video>`;
        } else if (ad.type === "html" && ad.html) {
            content = `<div class="html-ad">${ad.html}</div>`;
        } else if (ad.type === "text" && ad.text) {
            content = `<div class="text-ad">${ad.text}</div>`;
        }

        slide.innerHTML = content;
        slider.appendChild(slide);
    });

    if (ads.length > 1) enableVerticalSlider(slider, ads.length);
}

function enableVerticalSlider(slider, count) {
    let index = 0;
    let paused = false;

    const wrapper = document.getElementById("adSliderWrapper");

    wrapper.addEventListener("mouseenter", () => paused = true);
    wrapper.addEventListener("mouseleave", () => paused = false);

    setInterval(() => {
        if (paused) return;
        index = (index + 1) % count;
        slider.style.transform = `translateY(-${index * 600}px)`;
    }, 4000);
}

loadSidebarAds();
