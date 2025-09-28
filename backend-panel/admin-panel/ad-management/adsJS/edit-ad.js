const adId = new URLSearchParams(window.location.search).get('id');
const previewEl = document.getElementById('preview');

function renderPreview(ad) {
    previewEl.innerHTML = '';
    const previewContainer = document.getElementById('previewContainer');

    // Clear previous preview
    previewContainer.innerHTML = '';
    previewEl.innerHTML = '';

    if (ad.type === 'image') {
        if (ad.file && ad.file.startsWith('data:image')) {
            previewEl.innerHTML = `<img src="${ad.file}" alt="Ad Preview" style="max-width:100%; max-height:200px;">`;
            previewContainer.innerHTML = `<img src="${ad.file}" style="max-width:100%; max-height:200px;">`;
        } else {
            previewContainer.innerHTML = '<p>No image available</p>';
        }
    }
    else if (ad.type === 'video') {
        if (ad.file && ad.file.startsWith('data:video')) {
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

    const formData = new FormData();
    const adFileInput = document.getElementById('adFile');

    // Add all form fields to FormData
    formData.append('id', document.getElementById('adId').value);
    formData.append('type', document.getElementById('adType').value);
    formData.append('category', document.getElementById('adCategory').value);
    formData.append('startDate', document.getElementById('startDate').value);
    formData.append('endDate', document.getElementById('endDate').value);
    formData.append('active', document.getElementById('adActive').checked);
    formData.append('html', document.getElementById('adHtml').value);
    formData.append('text', document.getElementById('adText').value);
    formData.append('link', document.getElementById('adLink').value);
    formData.append('company', document.getElementById('adCompany').value);


    // Handle file upload if a new file was selected
    if (adFileInput.files[0]) {
        formData.append('file', adFileInput.files[0]);
    }

    try {
        const response = await fetch(`https://wrytix.onrender.com/ads/${adId}`, {
            method: 'PUT',
            body: formData
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

document.getElementById('adFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const previewContainer = document.getElementById('previewContainer');
        if (file.type.startsWith('image/')) {
            previewContainer.innerHTML = `<img src="${event.target.result}" style="max-width:100%; max-height:200px;">`;
        } else if (file.type.startsWith('video/')) {
            previewContainer.innerHTML = `<video controls src="${event.target.result}" style="max-width:100%; max-height:200px;"></video>`;
        }
    };
    reader.readAsDataURL(file);
});



async function loadAd() {
    if (!adId) {
        document.querySelector('main').innerHTML = '<p>No ad selected.</p>';
        return;
    }

    try {
        // Load ad data
        const adRes = await fetch(`https://wrytix.onrender.com/ads/${adId}`);
        if (!adRes.ok) throw new Error('Failed to load ad');
        const ad = await adRes.json();

        // Load categories
        const categoriesRes = await fetch('https://wrytix.onrender.com/ads');
        const allAds = await categoriesRes.json();
        const categories = [...new Set(allAds.map(a => a.category))];

        // Populate form
        document.getElementById('adId').value = ad.id;

        // Populate type dropdown
        const typeSelect = document.getElementById('adType');
        typeSelect.innerHTML = `
            <option value="image" ${ad.type === 'image' ? 'selected' : ''}>Image</option>
            <option value="video" ${ad.type === 'video' ? 'selected' : ''}>Video</option>
            <option value="html" ${ad.type === 'html' ? 'selected' : ''}>HTML</option>
            <option value="text" ${ad.type === 'text' ? 'selected' : ''}>Text</option>
        `;

        // Populate category dropdown
        const categorySelect = document.getElementById('adCategory');
        categorySelect.innerHTML = categories.map(cat =>
            `<option value="${cat}" ${cat === ad.category ? 'selected' : ''}>${cat}</option>`
        ).join('');

        // Fill other fields
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

