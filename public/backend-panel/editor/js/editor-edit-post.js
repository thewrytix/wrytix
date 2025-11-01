const BASE_URL = "https://wrytix.onrender.com";
const getParam = key => new URLSearchParams(location.search).get(key);
const toast = (msg, isError = false) => {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.style.background = isError ? "crimson" : "#222";
    el.style.display = "block";
    setTimeout(() => (el.style.display = "none"), 3000);
};

const slug = getParam("slug");
if (!slug) document.querySelector(".admin-main").innerHTML = "<p>No post selected.</p>";

const title = document.getElementById("editPostTitle");
const slugField = document.getElementById("editPostSlug");
const author = document.getElementById("editPostAuthor");
const category = document.getElementById("editPostCategory");
const content = document.getElementById("editPostContent");
const source = document.getElementById("editPostSource");
const featured = document.getElementById("editPostFeatured");
const schedule = document.getElementById("editPostSchedule");
const thumbInput = document.getElementById("postThumbnail");
const thumbPreview = document.getElementById("thumbnailPreview");
const thumbContainer = document.getElementById("thumbnailPreviewContainer");
const removeBtn = document.getElementById("removeThumbnailBtn");

let post = null;

const slugify = text =>
    text.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');

// Update slug + source on title input
title.addEventListener('input', e => {
    const newSlug = slugify(e.target.value);
    slugField.value = newSlug;
    source.value = `${newSlug}-post.html`;
});

fetch(`${BASE_URL}/posts/${slug}`)
    .then(r => r.json())
    .then(data => {
        post = data;
        title.value = post.title;
        slugField.value = post.slug;
        author.value = post.author;
        category.value = post.category;
        content.innerHTML = post.content;
        makeImagesResizable();
        source.value = post.source || "";
        featured.checked = post.featured;
        if (post.schedule) schedule.value = new Date(post.schedule).toISOString().slice(0, 16);
        if (post.thumbnail) {
            thumbPreview.src = post.thumbnail;
            thumbContainer.style.display = "block";
        }
    });

thumbInput.addEventListener("change", () => {
    const file = thumbInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = e => {
            thumbPreview.src = e.target.result;
            thumbContainer.style.display = "block";
        };
        reader.readAsDataURL(file);
    }
});

removeBtn.addEventListener("click", () => {
    thumbPreview.src = "";
    thumbInput.value = "";
    thumbContainer.style.display = "none";
    if (post) post.thumbnail = "";
});

document.getElementById("editPostForm").addEventListener("submit", e => {
    e.preventDefault();
    if (!post) return;

    const updated = {
        ...post,
        title: title.value.trim(),
        author: author.value.trim(),
        category: category.value,
        content: content.innerHTML.trim(),
        source: source.value.trim(),
        featured: featured.checked,
        schedule: schedule.value ? new Date(schedule.value).toISOString() : new Date().toISOString(),
        thumbnail: thumbPreview.src || ""
    };

    fetch(`${BASE_URL}/posts/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
    })
        .then(r => {
            if (!r.ok) throw new Error("Failed to update post.");
            showSuccess("✅ Post updated!");
            setTimeout(() => location.href = "editor-posts.html", 1500);
        })
        .catch(err => showError("❌ " + err.message));
});


document.getElementById("deletePostBtn").addEventListener("click", () => {
    if (!confirm("Delete this post?")) return;

    fetch(`${BASE_URL}/posts/${slug}`, { method: "DELETE" })
        .then(() => {
            showSuccess("🗑️ Post deleted!");
            setTimeout(() => location.href = "posts-list.html", 1500);
        })
        .catch(err => showError("❌ " + err.message));
});


document.getElementById("previewBtn").addEventListener("click", () => {
    if (!post) return;
    const previewData = {
        ...post,
        title: title.value,
        author: author.value,
        category: category.value,
        content: content.innerHTML,
        thumbnail: thumbPreview.src || "",
        featured: featured.checked,
        schedule: schedule.value ? new Date(schedule.value).toISOString() : new Date().toISOString(),
        source: source.value.trim()
    };
    sessionStorage.setItem("previewPost", JSON.stringify(previewData));
    window.open("preview.html", "_blank");
});

document.getElementById('editPostContent').addEventListener('paste', function (e) {
    e.preventDefault();
    const clipboardData = e.clipboardData || window.clipboardData;
    const htmlData = clipboardData.getData('text/html');
    const textData = clipboardData.getData('text/plain');
    const items = clipboardData.items;

    for (const item of items) {
        if (item.type.indexOf("image") === 0) {
            const blob = item.getAsFile();
            const reader = new FileReader();
            reader.onload = function (event) {
                insertImageAndContinue(event.target.result);
            };
            reader.readAsDataURL(blob);
            return;
        }
    }

    if (htmlData) {
        document.execCommand('insertHTML', false, htmlData);
    } else {
        document.execCommand('insertText', false, textData);
    }
});


const readFileAsDataURL = file =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });



function applyHeading(select) {
    const level = select.value;
    if (level) {
        formatText('formatBlock', `<${level}>`);
        select.value = '';
    }
}

function formatText(command, value = null) {
    if (command === 'createLink') {
        const url = prompt("Enter the link URL:");
        if (url) document.execCommand(command, false, url);
    } else {
        document.execCommand(command, false, value);
    }
}


function insertImage() {
    document.getElementById("imageUploader").click();
}

document.getElementById("imageUploader").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (file) {
        const url = await readFileAsDataURL(file);
        insertImageAndContinue(url);
        e.target.value = "";
    }
});

function insertImageAndContinue(url) {
    const editor = document.getElementById('editPostContent');
    editor.focus();

    const range = window.getSelection().getRangeAt(0);
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<img src="${url}" style="max-width:100%;border-radius:4px;" />`;

    const spacer = document.createElement('div');
    spacer.innerHTML = '<br>';
    spacer.style.minHeight = '20px';

    range.insertNode(spacer);
    range.insertNode(wrapper);

    const newRange = document.createRange();
    newRange.setStart(spacer, 0);
    newRange.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(newRange);

    makeImagesResizable();
    showSuccess('Image added');
}

document.getElementById('editPostContent').addEventListener('dragover', e => {
    e.preventDefault();
    e.currentTarget.style.border = '2px dashed #aaa';
});

document.getElementById('editPostContent').addEventListener('dragleave', e => {
    e.preventDefault();
    e.currentTarget.style.border = '1px solid var(--border-color)';
});


document.getElementById('editPostContent').addEventListener('drop', async e => {
    e.preventDefault();
    e.currentTarget.style.border = '1px solid var(--border-color)';
    const files = e.dataTransfer.files;
    for (const file of files) {
        if (file.type.startsWith('image/')) {
            const imageUrl = await readFileAsDataURL(file);
            insertImageAndContinue(imageUrl);
            makeImagesResizable();  // Add this
        }
    }
});

document.getElementById('fontColorPicker').addEventListener('input', function () {
    document.getElementById('editPostContent').focus();
    const color = this.value;
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('foreColor', false, color);
});

document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
            case 'b': e.preventDefault(); formatText('bold'); break;
            case 'i': e.preventDefault(); formatText('italic'); break;
            case 'u': e.preventDefault(); formatText('underline'); break;
            case 'l': if (e.shiftKey) { e.preventDefault(); formatText('justifyLeft'); } break;
            case 'e': if (e.shiftKey) { e.preventDefault(); formatText('justifyCenter'); } break;
            case 'r': if (e.shiftKey) { e.preventDefault(); formatText('justifyRight'); } break;
        }
    }
});

function makeImagesResizable() {
    const editor = document.getElementById('editPostContent');
    const images = editor.querySelectorAll('img');

    images.forEach(img => {
        if (img.closest('.resizable-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'resizable-wrapper';
        wrapper.contentEditable = false;
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        wrapper.style.margin = '6px 0';

        img.style.display = 'block';
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.maxWidth = '100%';
        img.style.pointerEvents = 'none';

        const imgClone = img.cloneNode(true);
        wrapper.appendChild(imgClone);

        // Create toolbar
        const toolbar = document.createElement('div');
        toolbar.style.position = 'absolute';
        toolbar.style.top = '4px';
        toolbar.style.right = '4px';
        toolbar.style.zIndex = '10';
        toolbar.style.display = 'none';
        toolbar.style.gap = '4px';
        toolbar.style.background = 'rgba(0,0,0,0.6)';
        toolbar.style.padding = '2px 5px';
        toolbar.style.borderRadius = '4px';

        const replaceBtn = document.createElement('button');
        replaceBtn.innerHTML = '🔄';
        replaceBtn.style.cssText = 'background:#fff;border:none;padding:2px 5px;border-radius:3px;cursor:pointer;font-size:12px;';
        replaceBtn.onclick = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async () => {
                const file = input.files[0];
                if (file) {
                    const url = await readFileAsDataURL(file);
                    imgClone.src = url;
                }
            };
            input.click();
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '🗑';
        deleteBtn.style.cssText = 'background:#fff;border:none;padding:2px 5px;border-radius:3px;cursor:pointer;font-size:12px;';
        deleteBtn.onclick = () => wrapper.remove();

        toolbar.appendChild(replaceBtn);
        toolbar.appendChild(deleteBtn);
        wrapper.appendChild(toolbar);

        // Add resizers
        const resizers = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
        resizers.forEach(dir => {
            const handle = document.createElement('div');
            handle.className = `resizer ${dir}`;
            handle.dataset.dir = dir;
            Object.assign(handle.style, {
                position: 'absolute',
                width: '10px',
                height: '10px',
                background: '#fff',
                border: '1px solid #555',
                zIndex: 11,
                cursor: `${dir}-resize`,
                display: 'none'
            });

            const positions = {
                nw: ['top', 'left'],
                n: ['top', 'left: 50%', 'transform: translateX(-50%)'],
                ne: ['top', 'right'],
                w: ['top: 50%', 'left', 'transform: translateY(-50%)'],
                e: ['top: 50%', 'right', 'transform: translateY(-50%)'],
                sw: ['bottom', 'left'],
                s: ['bottom', 'left: 50%', 'transform: translateX(-50%)'],
                se: ['bottom', 'right'],
            };

            positions[dir].forEach(p => {
                const [prop, val] = p.includes(':') ? p.split(':').map(x => x.trim()) : [p, '0'];
                handle.style[prop] = val;
            });

            handle.addEventListener('mousedown', function (e) {
                e.preventDefault();
                const startX = e.clientX;
                const startY = e.clientY;
                const startWidth = imgClone.offsetWidth;
                const startHeight = imgClone.offsetHeight;

                function onMouseMove(e) {
                    const dx = e.clientX - startX;
                    const dy = e.clientY - startY;

                    switch (dir) {
                        case 'nw':
                            imgClone.style.width = `${startWidth - dx}px`;
                            imgClone.style.height = `${startHeight - dy}px`;
                            break;
                        case 'n':
                            imgClone.style.height = `${startHeight - dy}px`;
                            break;
                        case 'ne':
                            imgClone.style.width = `${startWidth + dx}px`;
                            imgClone.style.height = `${startHeight - dy}px`;
                            break;
                        case 'w':
                            imgClone.style.width = `${startWidth - dx}px`;
                            break;
                        case 'e':
                            imgClone.style.width = `${startWidth + dx}px`;
                            break;
                        case 'sw':
                            imgClone.style.width = `${startWidth - dx}px`;
                            imgClone.style.height = `${startHeight + dy}px`;
                            break;
                        case 's':
                            imgClone.style.height = `${startHeight + dy}px`;
                            break;
                        case 'se':
                            imgClone.style.width = `${startWidth + dx}px`;
                            imgClone.style.height = `${startHeight + dy}px`;
                            break;
                    }
                }

                function onMouseUp() {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                }

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });

            wrapper.appendChild(handle);
        });

        wrapper.addEventListener('click', function (e) {
            e.stopPropagation();
            document.querySelectorAll('.resizable-wrapper').forEach(w => {
                w.classList.remove('active');
                w.querySelectorAll('.resizer').forEach(r => r.style.display = 'none');
                const tb = w.querySelector('div[style*="position: absolute"]');
                if (tb) tb.style.display = 'none';
            });
            wrapper.classList.add('active');
            wrapper.querySelectorAll('.resizer').forEach(r => r.style.display = 'block');
            toolbar.style.display = 'flex';
        });

        img.parentNode.insertBefore(wrapper, img);
        img.remove();
    });

    // Hide resizers on outside click
    document.addEventListener('click', () => {
        document.querySelectorAll('.resizable-wrapper').forEach(w => {
            w.classList.remove('active');
            w.querySelectorAll('.resizer').forEach(r => r.style.display = 'none');
            const tb = w.querySelector('div[style*="position: absolute"]');
            if (tb) tb.style.display = 'none';
        });
    });
}