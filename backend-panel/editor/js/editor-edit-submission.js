window.addEventListener('load', () => {
    const BASE_URL = "https://wrytix.onrender.com";

    const getQueryParam = key => new URLSearchParams(window.location.search).get(key);
    const id = getQueryParam('id');

    if (!id) {
        document.querySelector('.admin-main').innerHTML = '<p>No submission selected to edit.</p>';
        return;
    }

    const editTitle = document.getElementById('title');
    const editAuthor = document.getElementById('author');
    const editCategory = document.getElementById('category');
    const editContent = document.getElementById('content');
    const editSchedule = document.getElementById('schedule');
    const editFeatured = document.getElementById('featured');
    const editSource = document.getElementById('source');
    const thumbnailInput = document.getElementById('thumbnail');
    const thumbnailImg = document.getElementById('thumbnailPreview');
    const previewContainer = document.getElementById('thumbnailPreviewContainer');
    const removeBtn = document.getElementById('removeThumbnail');
    const form = document.getElementById('editSubmissionForm');

    let post = null;

    const toDateTimeLocal = iso => {
        const dt = new Date(iso);
        const pad = n => String(n).padStart(2, '0');
        return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    };

    function populateForm(data) {
        editTitle.value = data.title || '';
        editAuthor.value = data.submittedBy || data.author || '';
        editCategory.value = data.category || '';
        editContent.innerHTML = data.content || '';
        editSchedule.value = data.schedule ? toDateTimeLocal(data.schedule) : '';
        editFeatured.checked = !!data.featured || !!data.isFeatured;
        editSource.value = data.source || '';
        if (data.thumbnail) {
            thumbnailImg.src = data.thumbnail;
            previewContainer.style.display = 'block';
        }
        makeImagesResizable();
    }

    fetch(`${BASE_URL}/postSubmissions/${id}`, { credentials: 'include' })
        .then(res => {
            if (!res.ok) throw new Error("Submission not found.");
            return res.json();
        })
        .then(data => {
            post = data;
            populateForm(data);
        })
        .catch(err => {
            document.querySelector('.admin-main').innerHTML = `<p>${err.message}</p>`;
        });

    thumbnailInput.addEventListener('change', () => {
        const file = thumbnailInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            thumbnailImg.src = e.target.result;
            previewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
    });

    removeBtn.addEventListener('click', () => {
        thumbnailImg.src = '';
        thumbnailInput.value = '';
        previewContainer.style.display = 'none';
        if (post) post.thumbnail = '';
    });

    form.addEventListener('submit', e => {
        e.preventDefault();
        if (!post) return;

        const updated = {
            ...post,
            title: editTitle.value.trim(),
            submittedBy: editAuthor.value.trim(),
            category: editCategory.value,
            content: editContent.innerHTML.trim(),
            schedule: editSchedule.value ? new Date(editSchedule.value).toISOString() : new Date().toISOString(),
            featured: editFeatured.checked,
            source: editSource.value.trim(),
            thumbnail: thumbnailImg.src
        };

        fetch(`${BASE_URL}/postSubmissions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(updated)
        })
            .then(res => {
                if (!res.ok) throw new Error("Failed to update submission.");
                showSuccess("✅ Submission updated successfully.");
                setTimeout(() => {
                    window.location.href = "editor-posts-approval.html";
                }, 3000);
            })
            .catch(err => {
                showError("❌ " + err.message);
            });
    });
});

document.getElementById('content').addEventListener('paste', function (e) {
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
    const editor = document.getElementById('content');
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

document.getElementById('content').addEventListener('dragover', e => {
    e.preventDefault();
    e.currentTarget.style.border = '2px dashed #aaa';
});

document.getElementById('content').addEventListener('dragleave', e => {
    e.preventDefault();
    e.currentTarget.style.border = '1px solid var(--border-color)';
});


document.getElementById('content').addEventListener('drop', async e => {
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
    document.getElementById('content').focus();
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
    const editor = document.getElementById('content');
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