
const slugify = (text) =>
    text.toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');

document.getElementById('postTitle').addEventListener('input', (e) => {
    document.getElementById('postSlug').value = slugify(e.target.value);
    document.getElementById('postSource').value = `${slugify(e.target.value)}-post.html`;
});

document.getElementById('postThumbnail').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const preview = document.getElementById('thumbnailPreview');
    const container = document.getElementById('thumbnailPreviewContainer');
    if (file) {
        const reader = new FileReader();
        reader.onload = () => {
            preview.src = reader.result;
            container.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
});

document.getElementById('submitPostForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('postTitle').value.trim();
    const slug = document.getElementById('postSlug').value.trim();
    const content = document.getElementById('postContent').innerHTML.trim();
    const author = document.getElementById('postAuthor').value.trim();
    const category = document.getElementById('postCategory').value;
    const source = document.getElementById('postSource').value.trim();
    const isFeatured = document.getElementById('postFeatured').checked;
    const scheduleInput = document.getElementById('postSchedule').value;
    const schedule = scheduleInput ? new Date(scheduleInput).toISOString() : new Date().toISOString();

    const file = document.getElementById('postThumbnail').files[0];
    const thumbnail = file ? await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result);
        reader.onerror = rej;
        reader.readAsDataURL(file);
    }) : '';

    const submittedBy = sessionStorage.getItem('currentUser') || 'anonymous';
    const data = {
        title,
        slug,
        content,
        category,
        author,
        source,
        isFeatured,
        schedule,
        thumbnail,
        submittedBy,
        status: 'pending',
        editorComments: '',
        views: 0,
        lastViewed: new Date().toISOString()
    };

    try {
        const res = await fetch('https://wrytix.onrender.com/postSubmissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include'
        });

        if (!res.ok) throw new Error(await res.text());
        showSuccess('✅ Submission successful! Awaiting editor review.');
        document.getElementById('submitPostForm').reset();
        document.getElementById('thumbnailPreviewContainer').style.display = 'none';

    } catch (err) {
        showError('❌ ' + err.message);
    }

});

const readFileAsDataURL = file =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });


document.getElementById('previewBtn')?.addEventListener('click', async () => {
    const data = await collectFormData();

    if (!data.title || !data.slug || !data.content || !data.category) {
        showError('Please fill in all required fields before previewing.');
        return;
    }

    sessionStorage.setItem('previewPost', JSON.stringify(data));
    window.open('preview.html', '_blank');
});




