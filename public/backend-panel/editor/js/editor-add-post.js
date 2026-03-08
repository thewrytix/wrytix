const slugify = text =>
    text.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');

const readFileAsDataURL = file =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

const resetFormUI = () => {
    document.getElementById('addPostForm').reset();
    document.getElementById('thumbnailPreviewContainer').style.display = 'none';
    document.getElementById('postContent').innerHTML = '';
};

document.getElementById('postTitle').addEventListener('input', e => {
    const slug = slugify(e.target.value);
    document.getElementById('postSlug').value = slug;
    document.getElementById('postSource').value = `${slug}-post.html`;
});

document.getElementById('postThumbnail').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (file) {
        const imageUrl = await readFileAsDataURL(file);
        document.getElementById('thumbnailPreview').src = imageUrl;
        document.getElementById('thumbnailPreviewContainer').style.display = 'block';
    }
});





async function collectFormData() {
    const title = document.getElementById('postTitle').value.trim();
    const slug = document.getElementById('postSlug').value.trim();
    const author = document.getElementById('postAuthor').value.trim();
    const category = document.getElementById('postCategory').value;
    const source = document.getElementById('postSource').value.trim();
    const featured = document.getElementById('postFeatured').checked;
    const schedule = document.getElementById('postSchedule').value;
    const content = document.getElementById('postContent').innerHTML.trim();

    const thumbnailInput = document.getElementById('postThumbnail');
    let thumbnail = '';
    if (thumbnailInput.files[0]) {
        thumbnail = await readFileAsDataURL(thumbnailInput.files[0]);
    }

    return {
        title,
        slug,
        author,
        category,
        thumbnail,
        content,
        source,
        featured,
        schedule
    };
}
document.getElementById('previewBtn')?.addEventListener('click', async () => {
    const data = await collectFormData();

    if (!data.title || !data.slug || !data.content || !data.category) {
        showError('Please fill in all required fields before previewing.');
        return;
    }

    localStorage.setItem('previewPost', JSON.stringify(data));
    window.open('preview.html', '_blank');
});


document.getElementById('addPostForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    document.getElementById('postContentHidden').value = document.getElementById('postContent').innerHTML;
    const data = await collectFormData();

    if (!data.title || !data.slug || !data.content || !data.category || !data.author) {
        showError('Please complete all required fields.');
        return;
    }

    data.views = 0;
    data.lastViewed = new Date().toISOString();

    try {
        const response = await fetch('https://wrytix.onrender.com/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include'

        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to add post.');
        }

        showSuccess('Post added successfully!');
        resetFormUI();
    } catch (err) {
        showError(`Error: ${err.message}`);
    }
});
