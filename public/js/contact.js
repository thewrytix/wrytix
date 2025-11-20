//Contact-Form
//Contact-Form
document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector('.contact-form');
    const API_BASE = 'https://wrytix.onrender.com';

    // Loading/Error helpers (same pattern as login)
    function showLoading(show = true) {
        let loadingEl = form.querySelector('.loading');
        if (!loadingEl) {
            loadingEl = document.createElement('div');
            loadingEl.className = 'loading';
            loadingEl.textContent = 'Sending message...';
            loadingEl.style.cssText = 'text-align: center; color: #007bff; margin-top: 10px; display: none;';
            form.appendChild(loadingEl);
        }
        loadingEl.style.display = show ? 'block' : 'none';
    }

    function showError(message, isSuccess = false) {
        let errorEl = form.querySelector('.error');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.className = 'error';
            errorEl.style.cssText = `color: ${isSuccess ? 'green' : 'red'}; margin-top: 10px; text-align: center; display: none;`;
            form.appendChild(errorEl);
        }
        // SECURE: Escape error messages
        errorEl.innerHTML = SecurityUtils.escapeHtml(message);
        errorEl.style.display = 'block';
        if (isSuccess) {
            setTimeout(() => { errorEl.style.display = 'none'; }, 5000);
        }
    }

    // Contact form handler - SECURE VERSION
    async function handleContactSubmit(e) {
        e.preventDefault();

        // Get raw inputs (for sending to API)
        const rawName = document.getElementById('name').value.trim();
        const rawEmail = document.getElementById('email').value.trim();
        const rawMessage = document.getElementById('message').value.trim();

        // Create sanitized versions for validation/display
        const sanitizedName = SecurityUtils.sanitizeInput(rawName, { maxLength: 100 });
        const sanitizedEmail = SecurityUtils.sanitizeInput(rawEmail, { maxLength: 100 });
        const sanitizedMessage = SecurityUtils.sanitizeInput(rawMessage, { maxLength: 1000 });

        // Validate using SANITIZED data
        if (!sanitizedName || !sanitizedEmail || !sanitizedMessage) {
            showError('Please fill all fields');
            return;
        }

        // Additional email validation
        if (!isValidEmail(sanitizedEmail)) {
            showError('Please enter a valid email address');
            return;
        }

        showLoading(true);
        const errorEl = form.querySelector('.error');
        if (errorEl) errorEl.style.display = 'none';

        try {
            const response = await fetch(`${API_BASE}/contact`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // Send RAW data to API (backend should validate)
                body: JSON.stringify({
                    name: rawName,
                    email: rawEmail,
                    message: rawMessage
                })
            });

            const result = await response.json();

            if (response.ok) {
                // Success - clear form and show success message
                form.reset();
                showError('Thank you! Your message has been sent successfully.', true);
            } else {
                // Safely display error message from server
                const errorMessage = SecurityUtils.escapeHtml(result.error || 'Something went wrong. Please try again.');
                showError(errorMessage);
            }
        } catch (error) {
            console.error('Error:', error);
            showError('Network error. Please check your connection and try again.');
        } finally {
            showLoading(false);
        }
    }

    // Email validation function
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Real-time validation (optional enhancement)
    function addRealTimeValidation() {
        const inputs = form.querySelectorAll('input, textarea');

        inputs.forEach(input => {
            input.addEventListener('input', function() {
                // Clear any existing errors when user starts typing
                const errorElement = form.querySelector('.error');
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

    // Form submit listener
    form.addEventListener('submit', handleContactSubmit);

    // Initialize real-time validation
    addRealTimeValidation();
});

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
