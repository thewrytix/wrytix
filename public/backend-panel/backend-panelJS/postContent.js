// Function to insert an image into the editor and continue editing
function insertImageAndContinue(url) {
    const editor = document.getElementById('postContent');
    editor.focus();

    // Get current text selection range
    const range = window.getSelection().getRangeAt(0);

    // Create wrapper div for image
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<img src="${url}" style="max-width:100%;border-radius:4px;" />`;

    // Spacer div to add line break after image
    const spacer = document.createElement('div');
    spacer.innerHTML = '<br>';
    spacer.style.minHeight = '20px';

    // Insert spacer and image wrapper into editor
    range.insertNode(spacer);
    range.insertNode(wrapper);

    // Move cursor after inserted image
    const newRange = document.createRange();
    newRange.setStart(spacer, 0);
    newRange.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(newRange);

    // Make images resizable and show success notification
    makeImagesResizable();
    showSuccess('Image added');
}

// Handle paste events inside editor
document.getElementById('postContent').addEventListener('paste', function (e) {
    e.preventDefault();
    const clipboardData = e.clipboardData || window.clipboardData;
    const htmlData = clipboardData.getData('text/html');
    const textData = clipboardData.getData('text/plain');
    const items = clipboardData.items;

    // Check if pasted content is an image
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

    // Insert HTML or plain text if not image
    if (htmlData) {
        document.execCommand('insertHTML', false, htmlData);
    } else {
        document.execCommand('insertText', false, textData);
    }
});

// Handle dragover event to style border
document.getElementById('postContent').addEventListener('dragover', e => {
    e.preventDefault();
    e.currentTarget.style.border = '2px dashed #aaa';
});

// Reset border on drag leave
document.getElementById('postContent').addEventListener('dragleave', e => {
    e.preventDefault();
    e.currentTarget.style.border = '1px solid var(--border-color)';
});

// Handle drop event for images
document.getElementById('postContent').addEventListener('drop', async e => {
    e.preventDefault();
    e.currentTarget.style.border = '1px solid var(--border-color)';
    const files = e.dataTransfer.files;
    for (const file of files) {
        if (file.type.startsWith('image/')) {
            const imageUrl = await readFileAsDataURL(file);
            insertImageAndContinue(imageUrl);
        }
    }
});

// Apply heading (H1, H2, etc.)
function applyHeading(select) {
    const level = select.value;
    if (level) {
        formatText('formatBlock', `<${level}>`);
        select.value = '';
    }
}

// Apply text formatting
function formatText(command, value = null) {
    if (command === 'createLink') {
        const url = prompt("Enter the link URL:");
        if (url) document.execCommand(command, false, url);
    } else {
        document.execCommand(command, false, value);
    }
}

// Trigger file input to insert image
function insertImage() {
    document.getElementById('imageUploader').click();
}

// Handle file upload from file input
document.getElementById('imageUploader').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        const imageUrl = await readFileAsDataURL(file);
        insertImageAndContinue(imageUrl);
        e.target.value = ""; // Reset input
    }
});

// Handle font color changes
document.getElementById('fontColorPicker').addEventListener('input', function () {
    document.getElementById('postContent').focus();
    const color = this.value;
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('foreColor', false, color);
});

// Handle keyboard shortcuts (Ctrl+B, Ctrl+I, etc.)
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

// Handle background color changes
document.getElementById('bgColorPicker').addEventListener('input', function () {
    document.getElementById('postContent').focus();
    const color = this.value;
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('hiliteColor', false, color);
});

// Insert table function
function insertTable() {
    const rows = prompt("Enter number of rows:", "2");
    const cols = prompt("Enter number of columns:", "2");

    if (rows && cols) {
        let tableHTML = '<table border="1" style="border-collapse: collapse; width: 100%;">';
        for (let i = 0; i < rows; i++) {
            tableHTML += '<tr>';
            for (let j = 0; j < cols; j++) {
                tableHTML += '<td style="padding: 8px;">&nbsp;</td>';
            }
            tableHTML += '</tr>';
        }
        tableHTML += '</table><br>';

        document.execCommand('insertHTML', false, tableHTML);
    }
}

// -------------------- Image Resizing Logic -------------------- //
function makeImagesResizable() {
    const editor = document.getElementById('postContent');
    const images = editor.querySelectorAll('img');

    images.forEach(img => {
        if (img.closest('.resizable-wrapper')) return; // Skip if already wrapped

        // Create wrapper around image
        const wrapper = document.createElement('div');
        wrapper.className = 'resizable-wrapper';
        wrapper.contentEditable = false;
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        wrapper.style.margin = '6px 0';

        // Style image
        img.style.display = 'block';
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.maxWidth = '100%';
        img.style.pointerEvents = 'none';

        // Clone image inside wrapper
        const imgClone = img.cloneNode(true);
        wrapper.appendChild(imgClone);

        // Toolbar (replace/delete buttons)
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

        // Replace button
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

        //  Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '🗑';
        deleteBtn.style.cssText = 'background:#fff;border:none;padding:2px 5px;border-radius:3px;cursor:pointer;font-size:12px;';
        deleteBtn.onclick = () => wrapper.remove();

        // Add buttons to toolbar
        toolbar.appendChild(replaceBtn);
        toolbar.appendChild(deleteBtn);
        wrapper.appendChild(toolbar);

        // Resizers for resizing image
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

            // Define resizer positions
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

            // Apply positioning
            positions[dir].forEach(p => {
                const [prop, val] = p.includes(':') ? p.split(':').map(x => x.trim()) : [p, '0'];
                handle.style[prop] = val;
            });

            // Mouse events for resizing
            handle.addEventListener('mousedown', function (e) {
                e.preventDefault();
                const startX = e.clientX;
                const startY = e.clientY;
                const startWidth = imgClone.offsetWidth;
                const startHeight = imgClone.offsetHeight;

                // On mouse move, adjust size
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

                // Stop resizing on mouse up
                function onMouseUp() {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                }

                // Attach mousemove and mouseup listeners
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });

            wrapper.appendChild(handle);
        });

        // Click event to activate wrapper and show controls
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

        // Insert wrapper and remove original image
        img.parentNode.insertBefore(wrapper, img);
        img.remove();
    });

    // Hide resizers when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.resizable-wrapper').forEach(w => {
            w.classList.remove('active');
            w.querySelectorAll('.resizer').forEach(r => r.style.display = 'none');
            const tb = w.querySelector('div[style*="position: absolute"]');
            if (tb) tb.style.display = 'none';
        });
    });
}

// Function to insert video
function insertVideo() {
    const videoUrl = prompt("Enter video URL (YouTube, Vimeo, or direct video link):");

    if (!videoUrl) return;

    const editor = document.getElementById('postContent');
    editor.focus();

    let videoHTML = '';

    // YouTube embed
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        const videoId = extractYouTubeId(videoUrl);
        if (videoId) {
            videoHTML = `
                <div class="video-wrapper" contenteditable="false">
                    <iframe 
                        width="560" 
                        height="315" 
                        src="https://www.youtube.com/embed/${videoId}" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen>
                    </iframe>
                    <div class="video-controls">
                        <button onclick="replaceVideo(this)" class="video-btn">🔄</button>
                        <button onclick="deleteVideo(this)" class="video-btn">🗑</button>
                    </div>
                </div>
                <br>
            `;
        }
    }
    // Vimeo embed
    else if (videoUrl.includes('vimeo.com')) {
        const videoId = extractVimeoId(videoUrl);
        if (videoId) {
            videoHTML = `
                <div class="video-wrapper" contenteditable="false">
                    <iframe 
                        src="https://player.vimeo.com/video/${videoId}" 
                        width="560" 
                        height="315" 
                        frameborder="0" 
                        allow="autoplay; fullscreen; picture-in-picture" 
                        allowfullscreen>
                    </iframe>
                    <div class="video-controls">
                        <button onclick="replaceVideo(this)" class="video-btn">🔄</button>
                        <button onclick="deleteVideo(this)" class="video-btn">🗑</button>
                    </div>
                </div>
                <br>
            `;
        }
    }
    // Direct video file
    else if (videoUrl.match(/\.(mp4|webm|ogg|mov|avi)$/i)) {
        videoHTML = `
            <div class="video-wrapper" contenteditable="false">
                <video controls width="560" style="max-width:100%;">
                    <source src="${videoUrl}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
                <div class="video-controls">
                    <button onclick="replaceVideo(this)" class="video-btn">🔄</button>
                    <button onclick="deleteVideo(this)" class="video-btn">🗑</button>
                </div>
            </div>
            <br>
        `;
    }
    // Unsupported URL
    else {
        alert("Please enter a valid YouTube, Vimeo, or direct video URL (mp4, webm, ogg, mov, avi)");
        return;
    }

    // Insert video into editor
    document.execCommand('insertHTML', false, videoHTML);
    showSuccess('Video added');
}

// Extract YouTube video ID
function extractYouTubeId(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
}

// Extract Vimeo video ID
function extractVimeoId(url) {
    const regExp = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
}

// Replace video
function replaceVideo(button) {
    const wrapper = button.closest('.video-wrapper');
    const currentIframe = wrapper.querySelector('iframe, video');
    const currentSrc = currentIframe.src || currentIframe.querySelector('source')?.src;

    const newUrl = prompt("Enter new video URL:", currentSrc);
    if (newUrl) {
        insertVideoAtPosition(newUrl, wrapper);
        wrapper.remove();
    }
}

// Delete video
function deleteVideo(button) {
    const wrapper = button.closest('.video-wrapper');
    wrapper.nextElementSibling?.remove(); // Remove the <br> after
    wrapper.remove();
}

// Helper function to insert video at specific position
function insertVideoAtPosition(url, replaceElement) {
    // This would be similar to insertVideo() but positioned relative to replaceElement
    insertVideo(); // For now, just use the main function
}

// Add to your existing file upload handling
function uploadVideo() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            // For now, use data URL - in production, upload to server
            const videoUrl = await readFileAsDataURL(file);
            insertVideoAtUrl(videoUrl);
        }
    };
    input.click();
}

// Helper function for direct video URLs
function insertVideoAtUrl(url) {
    const editor = document.getElementById('postContent');
    editor.focus();

    const videoHTML = `
        <div class="video-wrapper" contenteditable="false">
            <video controls width="560" style="max-width:100%;">
                <source src="${url}" type="${getVideoMimeType(url)}">
                Your browser does not support the video tag.
            </video>
            <div class="video-controls">
                <button onclick="replaceVideo(this)" class="video-btn">🔄</button>
                <button onclick="deleteVideo(this)" class="video-btn">🗑</button>
            </div>
        </div>
        <br>
    `;

    document.execCommand('insertHTML', false, videoHTML);
    showSuccess('Video uploaded');
}

function getVideoMimeType(url) {
    if (url.includes('.mp4')) return 'video/mp4';
    if (url.includes('.webm')) return 'video/webm';
    if (url.includes('.ogg')) return 'video/ogg';
    return 'video/mp4';
}