document.getElementById('addAdForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    // DEBUG: Check if element exists
    const positionElement = document.getElementById('adPosition');
    console.log('Position element:', positionElement);
    console.log('Position value:', positionElement ? positionElement.value : 'ELEMENT NOT FOUND');

    const type = document.getElementById('adType').value;
    const category = document.getElementById('adCategory').value;
    const position = document.getElementById('adPosition').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const link = document.getElementById('adLink').value;
    const company = document.getElementById('adCompany').value;
    const active = document.getElementById('adActive').checked;
    const html = document.getElementById('adHtml').value;
    const text = document.getElementById('adText').value;

    const fileInput = document.getElementById('adFile');
    let fileBase64 = null;

    if ((type === 'image' || type === 'video') && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        fileBase64 = await toBase64(file);
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

    // DEBUG: Log the complete data being sent
    console.log('📤 COMPLETE DATA BEING SENT:');
    console.log(JSON.stringify(adData, null, 2));

    // Also log individual fields
    console.log('Individual fields:');
    console.log('- type:', type);
    console.log('- category:', category);
    console.log('- position:', position); // Check if this shows correctly
    console.log('- company:', company);
    console.log('- startDate:', startDate);
    console.log('- endDate:', endDate);
    console.log('- active:', active);

    try {
        const response = await fetch('https://wrytix.onrender.com/ads', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(adData),
            credentials: 'include'
        });

        // DEBUG: Log response status
        console.log('Response status:', response.status);

        const result = await response.json();
        console.log('📥 Server response:', result);

        if (response.ok) {
            showSuccess('Ad successfully created!');
            document.getElementById('addAdForm').reset();
            document.getElementById('filePreview').innerHTML = '';
            document.getElementById('adType').dispatchEvent(new Event('change'));
        } else {
            showError('Error: ' + (result.error || 'Something went wrong.'));
        }

    } catch (err) {
        console.error('Submission error:', err);
        showError('Submission failed. Please try again.');
    }
});


function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

document.getElementById('adFile').addEventListener('change', function () {
    const file = this.files[0];
    const preview = document.getElementById('filePreview');
    preview.innerHTML = '';

    if (!file) return;

    const url = URL.createObjectURL(file);

    if (file.type.startsWith('image')) {
        preview.innerHTML = `<img src="${url}" alt="Image Preview">`;
    } else if (file.type.startsWith('video')) {
        preview.innerHTML = `<video src="${url}" controls></video>`;
    }
});
