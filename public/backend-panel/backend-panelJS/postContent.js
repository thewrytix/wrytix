// Helper function to read file as data URL
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Show success notification
function showSuccess(message) {
    console.log('Success:', message);
    // You can replace this with your toast/notification system
    alert(message);
}

// Apply text formatting
function formatText(command, value = null) {
    try {
        if (command === 'createLink') {
            const url = prompt("Enter the link URL:");
            if (url) document.execCommand(command, false, url);
        } else {
            document.execCommand(command, false, value);
        }
    } catch (error) {
        console.error('Format error:', error);
    }
}

// Apply heading
function applyHeading(select) {
    try {
        const level = select.value;
        if (level) {
            document.execCommand('formatBlock', false, `<${level}>`);
            select.value = '';
        }
    } catch (error) {
        console.error('Heading error:', error);
    }
}

// Apply blockquote
function applyBlockquote() {
    try {
        const editor = document.getElementById('postContent');
        if (!editor) {
            console.error('Editor not found');
            return;
        }

        editor.focus();
        const selection = window.getSelection();

        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const selectedText = range.toString();

            if (selectedText) {
                // Wrap selected text in blockquote
                const blockquote = document.createElement('blockquote');
                blockquote.style.cssText = 'border-left: 4px solid #ccc; margin: 10px 0; padding-left: 15px; font-style: italic; color: #555;';
                blockquote.textContent = selectedText;

                range.deleteContents();
                range.insertNode(blockquote);
            } else {
                // Insert empty blockquote
                const blockquote = document.createElement('blockquote');
                blockquote.style.cssText = 'border-left: 4px solid #ccc; margin: 10px 0; padding-left: 15px; font-style: italic; color: #555;';
                blockquote.innerHTML = '&nbsp;';

                range.insertNode(blockquote);

                // Move cursor inside blockquote
                const newRange = document.createRange();
                newRange.setStart(blockquote, 0);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
            }
        }
    } catch (error) {
        console.error('Blockquote error:', error);
    }
}

// Insert table
function insertTable() {
    try {
        const rows = prompt("Enter number of rows:", "2");
        const cols = prompt("Enter number of columns:", "2");

        if (rows && cols) {
            let tableHTML = '<table border="1" style="border-collapse: collapse; width: 100%; margin: 10px 0;">';
            for (let i = 0; i < rows; i++) {
                tableHTML += '<tr>';
                for (let j = 0; j < cols; j++) {
                    tableHTML += '<td style="padding: 8px; border: 1px solid #999;">&nbsp;</td>';
                }
                tableHTML += '</tr>';
            }
            tableHTML += '</table>';

            document.execCommand('insertHTML', false, tableHTML);
        }
    } catch (error) {
        console.error('Table error:', error);
    }
}

// Insert image
function insertImage() {
    try {
        document.getElementById('imageUploader').click();
    } catch (error) {
        console.error('Image insert error:', error);
    }
}

// Handle image upload
document.addEventListener('DOMContentLoaded', function() {
    const imageUploader = document.getElementById('imageUploader');
    if (imageUploader) {
        imageUploader.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const imageUrl = await readFileAsDataURL(file);
                    insertImageAndContinue(imageUrl);
                    e.target.value = "";
                } catch (error) {
                    console.error('Image upload error:', error);
                }
            }
        });
    }
});

// Insert image and continue editing
function insertImageAndContinue(url) {
    try {
        const editor = document.getElementById('postContent');
        if (!editor) return;

        editor.focus();
        const range = window.getSelection().getRangeAt(0);

        const img = document.createElement('img');
        img.src = url;
        img.style.maxWidth = '100%';
        img.style.borderRadius = '4px';
        img.style.margin = '10px 0';

        range.insertNode(img);

        // Add space after image
        const br = document.createElement('br');
        range.insertNode(br);

        // Move cursor after image
        const newRange = document.createRange();
        newRange.setStartAfter(br);
        newRange.collapse(true);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(newRange);

        showSuccess('Image added');
    } catch (error) {
        console.error('Image insert error:', error);
    }
}

// Video functions
function insertVideo() {
    try {
        const choice = confirm("Click OK to upload video file, Cancel to enter video URL");

        if (choice) {
            uploadVideo();
        } else {
            insertVideoFromUrl();
        }
    } catch (error) {
        console.error('Video insert error:', error);
    }
}

function uploadVideo() {
    try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 50 * 1024 * 1024) {
                    alert('Video file too large. Please select a video under 50MB.');
                    return;
                }

                try {
                    const videoUrl = await readFileAsDataURL(file);
                    insertVideoAtUrl(videoUrl, file.type);
                } catch (error) {
                    console.error('Video upload error:', error);
                }
            }
        };
        input.click();
    } catch (error) {
        console.error('Video upload init error:', error);
    }
}

function insertVideoFromUrl() {
    try {
        const videoUrl = prompt("Enter video URL (YouTube, Vimeo, or direct video link):");
        if (!videoUrl) return;
        insertVideoAtUrl(videoUrl);
    } catch (error) {
        console.error('Video URL error:', error);
    }
}

function insertVideoAtUrl(url, mimeType = null) {
    try {
        const editor = document.getElementById('postContent');
        if (!editor) return;

        editor.focus();
        let videoHTML = '';

        // YouTube
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const videoId = extractYouTubeId(url);
            if (videoId) {
                videoHTML = `
                    <div style="margin: 10px 0;">
                        <iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" 
                                frameborder="0" allowfullscreen style="max-width:100%;">
                        </iframe>
                    </div>
                `;
            }
        }
        // Vimeo
        else if (url.includes('vimeo.com')) {
            const videoId = extractVimeoId(url);
            if (videoId) {
                videoHTML = `
                    <div style="margin: 10px 0;">
                        <iframe src="https://player.vimeo.com/video/${videoId}" 
                                width="560" height="315" frameborder="0" allowfullscreen style="max-width:100%;">
                        </iframe>
                    </div>
                `;
            }
        }
        // Direct video
        else if (url.match(/\.(mp4|webm|ogg|mov|avi)$/i) || url.startsWith('data:video/')) {
            const videoType = mimeType || getVideoMimeType(url);
            videoHTML = `
                <div style="margin: 10px 0;">
                    <video controls style="max-width:100%; height:auto; border-radius:4px;">
                        <source src="${url}" type="${videoType}">
                        Your browser does not support the video tag.
                    </video>
                </div>
            `;
        }

        if (videoHTML) {
            document.execCommand('insertHTML', false, videoHTML);
            showSuccess('Video added successfully');
        } else {
            alert("Invalid video URL");
        }
    } catch (error) {
        console.error('Video insert error:', error);
    }
}

// Video helper functions
function extractYouTubeId(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
}

function extractVimeoId(url) {
    const regExp = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
}

function getVideoMimeType(url) {
    if (url.includes('.mp4') || url.startsWith('data:video/mp4')) return 'video/mp4';
    if (url.includes('.webm') || url.startsWith('data:video/webm')) return 'video/webm';
    if (url.includes('.ogg') || url.startsWith('data:video/ogg')) return 'video/ogg';
    return 'video/mp4';
}

// Event listeners for color pickers
document.addEventListener('DOMContentLoaded', function() {
    const fontColorPicker = document.getElementById('fontColorPicker');
    const bgColorPicker = document.getElementById('bgColorPicker');

    if (fontColorPicker) {
        fontColorPicker.addEventListener('input', function() {
            try {
                document.getElementById('postContent').focus();
                document.execCommand('styleWithCSS', false, true);
                document.execCommand('foreColor', false, this.value);
            } catch (error) {
                console.error('Font color error:', error);
            }
        });
    }

    if (bgColorPicker) {
        bgColorPicker.addEventListener('input', function() {
            try {
                document.getElementById('postContent').focus();
                document.execCommand('styleWithCSS', false, true);
                document.execCommand('hiliteColor', false, this.value);
            } catch (error) {
                console.error('Background color error:', error);
            }
        });
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey) {
        try {
            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    formatText('bold');
                    break;
                case 'i':
                    e.preventDefault();
                    formatText('italic');
                    break;
                case 'u':
                    e.preventDefault();
                    formatText('underline');
                    break;
            }
        } catch (error) {
            console.error('Keyboard shortcut error:', error);
        }
    }
});

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Rich text editor initialized');
});