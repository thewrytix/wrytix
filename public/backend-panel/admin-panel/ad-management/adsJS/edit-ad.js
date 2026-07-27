const CLOUDINARY_CLOUD_NAME = 'dbtgim7l0';
const CLOUDINARY_UPLOAD_PRESET = 'wrytix_unsigned';

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

const adId = new URLSearchParams(window.location.search).get('id');
const previewEl = document.getElementById('preview');
let currentAdFileUrl = null; // tracks the existing Cloudinary URL, carried forward if no new file is picked

function renderPreview(ad) {
    previewEl.innerHTML = '';
    const previewContainer = document.getElementById('previewContainer');

    previewContainer.innerHTML = '';
    previewEl.innerHTML = '';

    if (ad.type === 'image') {
        if (ad.file) {
            previewEl.innerHTML = `<img src="${ad.file}" alt="Ad Preview" style="max-width:100%; max-height:200px;">`;
            previewContainer.innerHTML = `<img src="${ad.file}" style="max-width:100%; max-height:200px;">`;
        } else {
            previewContainer.innerHTML = '<p>No image available</p>';
        }
    }
    else if (ad.type === 'video') {
        if (ad.file) {
            previewEl.innerHTML = `<video controls src="${ad.file}" style="max-width:100%; max-height:200px;"></video>`;
            previewContainer.innerHTML = `<video controls src="${ad.file}" style="max-width:100%; max-height:200px;"></video>`;
        } else {
            previewContainer.innerHTML = '<p>No video available</p>';
        }
    }
    else if (ad.type === 'html' && ad.html) {
        previewEl.innerHTML = `<iframe srcdoc="${ad.html.replace(/"/g, '&quot;')}" style="width:100%; height:200px; border:1px solid #ccc;"></iframe>`;
    }
    else if (ad.type === 'text' && ad.text) {
        previewEl.innerHTML = `<div class="text-preview" style="padding:1rem; border:1px solid #ccc;">${ad.text}</div>`;
    }
    else {
        previewEl.innerHTML = '<p>No preview available</p>';
    }
}

document.getElementById('editAdForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const adFileInput = document.getElementById('adFile');
    let fileUrl = currentAdFileUrl; // default: keep existing file unless a new one is uploaded

    if (adFileInput.files[0]) {
        try {
            fileUrl = await uploadToCloudinary(adFileInput.files[0]);
        } catch (err) {
            console.error('Upload error:', err);
            showError('Failed to upload new file. Please try again.');
            return;
        }
    }

    const adData = {
        id: document.getElementById('adId').value,
        type: document.getElementById('adType').value,
        category: document.getElementById('adCategory').value,
        position: document.getElementById('adPosition').value,
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value,
        active: document.getElementById('adActive').checked,
        html: document.getElementById('adHtml').value,
        text: document.getElementById('adText').value,
        link: document.getElementById('adLink').value,
        company: document.getElementById('adCompany').value,
        file: fileUrl
    };

    try {
        const response = await fetch(`https://wrytix.onrender.com/ads/${adId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(adData),
            credentials: 'include'
        });

        if (response.ok) {
            showSuccess('✅ Ad updated successfully!');
            setTimeout(() => window.location.href = 'ads-list.html', 1500);
        } else {
            const error = await response.json();
            showError(`❌ Failed to update ad: ${error.error || 'Unknown error'}`);
        }

    } catch (err) {
        console.error('Update error:', err);
        showError('❌ Error occurred while updating the ad.');
    }
});

// Preview stays local/instant — no upload happens until submit
document.getElementById('adFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const previewContainer = document.getElementById('previewContainer');

    if (file.type.startsWith('image/')) {
        previewContainer.innerHTML = `<img src="${url}" style="max-width:100%; max-height:200px;">`;
    } else if (file.type.startsWith('video/')) {
        previewContainer.innerHTML = `<video controls src="${url}" style="max-width:100%; max-height:200px;"></video>`;
    }
});

async function loadAd() {
    if (!adId) {
        document.querySelector('main').innerHTML = '<p>No ad selected.</p>';
        return;
    }

    try {
        const adRes = await fetch(`https://wrytix.onrender.com/ads/${adId}`, {
            credentials: 'include'
        });
        if (!adRes.ok) throw new Error('Failed to load ad');
        const ad = await adRes.json();

        currentAdFileUrl = ad.file || null; // remember existing file URL for submit-without-replace case

        const categoriesRes = await fetch('https://wrytix.onrender.com/ads');
        const allAds = await categoriesRes.json();
        const categories = [...new Set(allAds.map(a => a.category))];
        const positions = [...new Set(allAds.map(a => a.position))];

        document.getElementById('adId').value = ad.id;

        const typeSelect = document.getElementById('adType');
        typeSelect.innerHTML = `
            <option value="image" ${ad.type === 'image' ? 'selected' : ''}>Image</option>
            <option value="video" ${ad.type === 'video' ? 'selected' : ''}>Video</option>
            <option value="html" ${ad.type === 'html' ? 'selected' : ''}>HTML</option>
            <option value="text" ${ad.type === 'text' ? 'selected' : ''}>Text</option>
        `;

        const categorySelect = document.getElementById('adCategory');
        categorySelect.innerHTML = categories.map(cat =>
            `<option value="${cat}" ${cat === ad.category ? 'selected' : ''}>${cat}</option>`
        ).join('');

        const positionSelect = document.getElementById('adPosition');
        positionSelect.innerHTML = positions.map(cat =>
            `<option value="${cat}" ${cat === ad.position ? 'selected' : ''}>${cat}</option>`
        ).join('');

        document.getElementById('adHtml').value = ad.html || '';
        document.getElementById('adText').value = ad.text || '';
        document.getElementById('adLink').value = ad.link || '';
        document.getElementById('adCompany').value = ad.company || '';
        document.getElementById('startDate').value = ad.startDate.split('T')[0];
        document.getElementById('endDate').value = ad.endDate.split('T')[0];
        document.getElementById('adActive').checked = ad.active;

        renderPreview(ad);
    } catch (err) {
        console.error('Load error:', err);
        document.querySelector('main').innerHTML = `<p>Error loading ad: ${err.message}</p>`;
    }
}

document.addEventListener('DOMContentLoaded', loadAd);