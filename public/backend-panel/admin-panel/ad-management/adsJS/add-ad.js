const CLOUDINARY_CLOUD_NAME = 'dbtgim7l0'; // same as posts
const CLOUDINARY_UPLOAD_PRESET = 'wrytix_unsigned'; // same unsigned preset as posts

async function uploadToCloudinary(file) {
    const resourceType = file.type.startsWith('video') ? 'video' : 'image';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`, {
        method: 'POST',
        body: formData
    });

    if (!res.ok) throw new Error('File upload failed');
    const data = await res.json();
    return data.secure_url;
}

document.getElementById('addAdForm').addEventListener('submit', async function (e) {
    e.preventDefault();

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
    let fileUrl = null;

    if ((type === 'image' || type === 'video') && fileInput.files.length > 0) {
        try {
            fileUrl = await uploadToCloudinary(fileInput.files[0]);
        } catch (err) {
            console.error('Upload error:', err);
            showError('Failed to upload file. Please try again.');
            return;
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
        file: fileUrl,
        active
    };

    try {
        const response = await fetch('https://wrytix.onrender.com/ads', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(adData),
            credentials: 'include'
        });

        const result = await response.json();

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

// Preview stays local/instant — no upload happens until submit
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