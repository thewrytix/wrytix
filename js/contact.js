//Contact-Form

const form = document.querySelector('.contact-form');
form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const formData = new FormData(form);

    const response = await fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: {
            'Accept': 'application/json'
        }
    });

    if (response.ok) {
        form.innerHTML = "<p>Thank you! Your message has been sent successfully.</p>";
    } else {
        form.innerHTML = "<p>Oops! Something went wrong. Please try again later.</p>";
    }
});

