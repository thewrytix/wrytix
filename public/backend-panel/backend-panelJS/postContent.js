// Modern rich text editor using alternative to execCommand
class RichTextEditor {
    constructor() {
        this.editor = document.getElementById('postContent');
        this.init();
    }

    init() {
        console.log('Rich text editor initialized');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Color pickers
        const fontColorPicker = document.getElementById('fontColorPicker');
        const bgColorPicker = document.getElementById('bgColorPicker');

        if (fontColorPicker) {
            fontColorPicker.addEventListener('input', (e) => {
                this.applyStyle('color', e.target.value);
            });
        }

        if (bgColorPicker) {
            bgColorPicker.addEventListener('input', (e) => {
                this.applyStyle('backgroundColor', e.target.value);
            });
        }

        // Image upload
        const imageUploader = document.getElementById('imageUploader');
        if (imageUploader) {
            imageUploader.addEventListener('change', (e) => {
                this.handleImageUpload(e);
            });
        }

        // Keyboard shortcuts - ONLY INTERCEPT SPECIFIC COMBINATIONS
        document.addEventListener('keydown', (e) => {
            // Only prevent default for the shortcuts we want to handle
            if ((e.ctrlKey || e.metaKey) && !e.altKey) {
                switch (e.key.toLowerCase()) {
                    case 'b':
                        e.preventDefault();
                        this.toggleBold();
                        break;
                    case 'i':
                        e.preventDefault();
                        this.toggleItalic();
                        break;
                    case 'u':
                        e.preventDefault();
                        this.toggleUnderline();
                        break;
                    case 'z':
                        if (!e.shiftKey) {
                            e.preventDefault();
                            this.undo();
                        } else {
                            e.preventDefault();
                            this.redo();
                        }
                        break;
                    case 'y':
                        e.preventDefault();
                        this.redo();
                        break;
                    case 'a':
                        // Allow Ctrl+A (Select All) - don't prevent default
                        break;
                    case 'c':
                    case 'x':
                    case 'v':
                        // Allow Ctrl+C, Ctrl+X, Ctrl+V - don't prevent default
                        break;
                    case 'l':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.justifyLeft();
                        }
                        break;
                    case 'e':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.justifyCenter();
                        }
                        break;
                    case 'r':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.justifyRight();
                        }
                        break;
                    case 'j':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.justifyFull();
                        }
                        break;
                    default:
                        // Allow all other Ctrl+key combinations
                        break;
                }
            }
        });
    }

    // Core formatting methods
    applyStyle(style, value) {
        document.execCommand('styleWithCSS', false, true);
        switch (style) {
            case 'bold': document.execCommand('bold', false, null); break;
            case 'italic': document.execCommand('italic', false, null); break;
            case 'underline': document.execCommand('underline', false, null); break;
            case 'color': document.execCommand('foreColor', false, value); break;
            case 'backgroundColor': document.execCommand('hiliteColor', false, value); break;
            case 'fontName': document.execCommand('fontName', false, value); break;
            case 'fontSize': document.execCommand('fontSize', false, value); break;
        }
    }

    // Specific formatting methods
    toggleBold() {
        this.applyStyle('bold');
    }

    toggleItalic() {
        this.applyStyle('italic');
    }

    toggleUnderline() {
        this.applyStyle('underline');
    }

    applyStrikethrough() {
        document.execCommand('strikeThrough', false, null);
    }

    undo() {
        document.execCommand('undo', false, null);
    }

    redo() {
        document.execCommand('redo', false, null);
    }

    justifyLeft() {
        document.execCommand('justifyLeft', false, null);
    }

    justifyCenter() {
        document.execCommand('justifyCenter', false, null);
    }

    justifyRight() {
        document.execCommand('justifyRight', false, null);
    }

    justifyFull() {
        document.execCommand('justifyFull', false, null);
    }

    insertList(ordered = false) {
        document.execCommand(ordered ? 'insertOrderedList' : 'insertUnorderedList');
    }

    applyHeading(level) {
        document.execCommand('formatBlock', false, `<${level}>`);
    }

    insertLink() {
        const url = prompt("Enter the link URL:");
        if (url) {
            document.execCommand('createLink', false, url);
        }
    }

    insertImage() {
        document.getElementById('imageUploader').click();
    }

    async handleImageUpload(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            try {
                const imageUrl = await this.readFileAsDataURL(file);
                this.insertImageAtCursor(imageUrl);
                e.target.value = "";
                
                this.showSuccess('Image added');
            } catch (error) {
                console.error('Image upload error:', error);
            }
        }
    }

    insertImageAtCursor(url) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);

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
            selection.removeAllRanges();
            selection.addRange(newRange);
        }
    }

    insertTable() {
        const rows = prompt("Enter number of rows:", "2");
        const cols = prompt("Enter number of columns:", "2");

        if (rows && cols) {
            let tableHTML = '<table border="1" style="border-collapse: collapse; width: 100%; margin: 10px 0;">';
            for (let i = 0; i < rows; i++) {
                tableHTML += '<tr>';
                for (let j = 0; j < cols; j++) {
                    tableHTML += `<td style="padding: 8px; border: 1px solid #999;">&nbsp;</td>`;
                }
                tableHTML += '</tr>';
            }
            tableHTML += '</table>';

            this.insertHTML(tableHTML);
        }
    }

    insertHTML(html) {
        document.execCommand('insertHTML', false, html);
    }

    applyBlockquote() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const selectedText = range.toString();

            if (selectedText) {
                const blockquote = document.createElement('blockquote');
                blockquote.style.cssText = 'border-left: 4px solid #ccc; margin: 10px 0; padding-left: 15px; font-style: italic; color: #555;';
                blockquote.textContent = selectedText;

                range.deleteContents();
                range.insertNode(blockquote);
            } else {
                const blockquote = document.createElement('blockquote');
                blockquote.style.cssText = 'border-left: 4px solid #ccc; margin: 10px 0; padding-left: 15px; font-style: italic; color: #555;';
                blockquote.innerHTML = '&nbsp;';

                range.insertNode(blockquote);

                const newRange = document.createRange();
                newRange.setStart(blockquote, 0);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
            }
        }
    }

    // Video methods
    insertVideo() {
        const choice = confirm("Click OK to upload video file, Cancel to enter video URL");
        choice ? this.uploadVideo() : this.insertVideoFromUrl();
    }

    uploadVideo() {
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
                    const videoUrl = await this.readFileAsDataURL(file);
                    this.insertVideoElement(videoUrl, file.type);
                } catch (error) {
                    console.error('Video upload error:', error);
                }
            }
        };
        input.click();
    }

    insertVideoFromUrl() {
        const videoUrl = prompt("Enter video URL:");
        if (videoUrl) {
            this.insertVideoElement(videoUrl);
        }
    }

    insertVideoElement(url, mimeType = null) {
        let videoHTML = '';

        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const videoId = this.extractYouTubeId(url);
            if (videoId) {
                videoHTML = `
                    <div style="margin: 10px 0;">
                        <iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" 
                                frameborder="0" allowfullscreen style="max-width:100%;">
                        </iframe>
                    </div>
                `;
            }
        } else if (url.includes('vimeo.com')) {
            const videoId = this.extractVimeoId(url);
            if (videoId) {
                videoHTML = `
                    <div style="margin: 10px 0;">
                        <iframe src="https://player.vimeo.com/video/${videoId}" 
                                width="560" height="315" frameborder="0" allowfullscreen style="max-width:100%;">
                        </iframe>
                    </div>
                `;
            }
        } else {
            const videoType = mimeType || this.getVideoMimeType(url);
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
            this.insertHTML(videoHTML);
            this.showSuccess('Video added successfully');
        } else {
            alert("Invalid video URL");
        }
    }

    // Utility methods
    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    showSuccess(message) {
        console.log('Success:', message);
        alert(message);
    }

    extractYouTubeId(url) {
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[7].length === 11) ? match[7] : null;
    }

    extractVimeoId(url) {
        const regExp = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/;
        const match = url.match(regExp);
        return match ? match[1] : null;
    }

    getVideoMimeType(url) {
        if (url.includes('.mp4') || url.startsWith('data:video/mp4')) return 'video/mp4';
        if (url.includes('.webm') || url.startsWith('data:video/webm')) return 'video/webm';
        if (url.includes('.ogg') || url.startsWith('data:video/ogg')) return 'video/ogg';
        return 'video/mp4';
    }
}

// Global functions for HTML onclick attributes
function formatText(command, value = null) {
    if (!window.richTextEditor) return;

    switch (command) {
        case 'bold': window.richTextEditor.toggleBold(); break;
        case 'italic': window.richTextEditor.toggleItalic(); break;
        case 'underline': window.richTextEditor.toggleUnderline(); break;
        case 'strikeThrough': window.richTextEditor.applyStrikethrough(); break;
        case 'insertUnorderedList': window.richTextEditor.insertList(false); break;
        case 'insertOrderedList': window.richTextEditor.insertList(true); break;
        case 'createLink': window.richTextEditor.insertLink(); break;
        case 'removeFormat': document.execCommand('removeFormat', false, null); break;
        case 'undo': window.richTextEditor.undo(); break;
        case 'redo': window.richTextEditor.redo(); break;
        case 'justifyLeft': window.richTextEditor.justifyLeft(); break;
        case 'justifyCenter': window.richTextEditor.justifyCenter(); break;
        case 'justifyRight': window.richTextEditor.justifyRight(); break;
        case 'justifyFull': window.richTextEditor.justifyFull(); break;
        case 'subscript': document.execCommand('subscript', false, null); break;
        case 'superscript': document.execCommand('superscript', false, null); break;
        case 'fontName': window.richTextEditor.applyStyle('fontName', value); break;
        case 'fontSize': window.richTextEditor.applyStyle('fontSize', value); break;
        case 'formatBlock': document.execCommand('formatBlock', false, value); break;
    }
}

function applyHeading(select) {
    if (select.value && window.richTextEditor) {
        window.richTextEditor.applyHeading(select.value);
        select.value = '';
    }
}

function applyBlockquote() {
    if (window.richTextEditor) {
        window.richTextEditor.applyBlockquote();
    }
}

function insertImage() {
    if (window.richTextEditor) {
        window.richTextEditor.insertImage();
    }
}

function insertTable() {
    if (window.richTextEditor) {
        window.richTextEditor.insertTable();
    }
}

function insertVideo() {
    if (window.richTextEditor) {
        window.richTextEditor.insertVideo();
    }
}

// Initialize editor
document.addEventListener('DOMContentLoaded', function() {
    window.richTextEditor = new RichTextEditor();
});