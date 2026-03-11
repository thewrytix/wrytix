// Wait until the DOM is fully loaded before trying to find elements
document.addEventListener('DOMContentLoaded', () => {

    console.log("DOM fully loaded → now looking for form");

    const form = document.getElementById('addAdForm');
    if (!form) {
        console.error("CRITICAL ERROR: Form with id='addAdForm' was NOT found in the page");
        return;
    }

    console.log("Form #addAdForm found → attaching submit listener");

    // ────────────────────────────────────────────────
    //   Submit handler
    // ────────────────────────────────────────────────
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        console.log("===== FORM SUBMIT HANDLER STARTED =====");

        // Check important elements early
        const positionElement = document.getElementById('adPosition');
        console.log('Position element:', positionElement);
        console.log('Position value:', positionElement ? positionElement.value : 'ELEMENT NOT FOUND');

        // Gather all values
        const type      = document.getElementById('adType')?.value     || '';
        const category  = document.getElementById('adCategory')?.value || '';
        const position  = document.getElementById('adPosition')?.value || '';
        const startDate = document.getElementById('startDate')?.value  || '';
        const endDate   = document.getElementById('endDate')?.value    || '';
        const link      = document.getElementById('adLink')?.value     || '';
        const company   = document.getElementById('adCompany')?.value  || '';
        const active    = document.getElementById('adActive')?.checked ?? false;
        const html      = document.getElementById('adHtml')?.value     || '';
        const text      = document.getElementById('adText')?.value     || '';

        const fileInput = document.getElementById('adFile');
        let fileBase64 = null;

        if ((type === 'image' || type === 'video') && fileInput?.files?.length > 0) {
            const file = fileInput.files[0];
            try {
                fileBase64 = await toBase64(file);
            } catch (err) {
                console.error("Failed to convert file to base64:", err);
            }
        }

        const adData = {
            type,
            category,
            position,
            company,
            startDate,
            endDate,
            link,
            html,
            text,
            file: fileBase64,
            active
        };

        // ─── Debug output ───────────────────────────────────────
        console.log('📤 COMPLETE DATA BEING SENT:');
        console.log(JSON.stringify(adData, null, 2));

        console.log('Individual fields:');
        console.log('- type     :', type);
        console.log('- category :', category);
        console.log('- position :', position);
        console.log('- company  :', company);
        console.log('- startDate:', startDate);
        console.log('- endDate  :', endDate);
        console.log('- active   :', active);
        // ───────────────────────────────────────────────────────

        try {
            const response = await fetch('https://wrytix.onrender.com/ads', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(adData),
                credentials: 'include'
            });

            console.log('Response status:', response.status);

            const result = await response.json();
            console.log('📥 Server response:', result);

            if (response.ok) {
                if (typeof showSuccess === 'function') {
                    showSuccess('Ad successfully created!');
                } else {
                    console.log("Success: Ad created (showSuccess not defined)");
                }
                form.reset();
                const preview = document.getElementById('filePreview');
                if (preview) preview.innerHTML = '';
                const adTypeSelect = document.getElementById('adType');
                if (adTypeSelect) adTypeSelect.dispatchEvent(new Event('change'));
            } else {
                const errorMsg = result.error || 'Something went wrong.';
                if (typeof showError === 'function') {
                    showError('Error: ' + errorMsg);
                } else {
                    console.error("Server error:", errorMsg);
                }
            }
        } catch (err) {
            console.error('Submission error:', err);
            if (typeof showError === 'function') {
                showError('Submission failed. Please try again.');
            }
        }
    });


    // ────────────────────────────────────────────────
    //   File preview handler
    // ────────────────────────────────────────────────
    const fileInput = document.getElementById('adFile');
    if (fileInput) {
        fileInput.addEventListener('change', function () {
            const file = this.files[0];
            const preview = document.getElementById('filePreview');
            if (!preview) return;

            preview.innerHTML = '';

            if (!file) return;

            const url = URL.createObjectURL(file);

            if (file.type.startsWith('image')) {
                preview.innerHTML = `<img src="${url}" alt="Image Preview" style="max-width:100%; max-height:300px;">`;
            } else if (file.type.startsWith('video')) {
                preview.innerHTML = `<video src="${url}" controls style="max-width:100%; max-height:300px;"></video>`;
            }
        });
    } else {
        console.warn("File input #adFile not found → preview will not work");
    }

}); // end DOMContentLoaded


// ────────────────────────────────────────────────
//   Helper: file → base64
// ────────────────────────────────────────────────
function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}