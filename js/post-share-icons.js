// Function to wait for elements to exist
function waitForElements(selectors, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        function checkElements() {
            const elements = {};
            let allFound = true;

            for (const [key, selector] of Object.entries(selectors)) {
                elements[key] = document.querySelector(selector);
                if (!elements[key]) {
                    allFound = false;
                    break;
                }
            }

            if (allFound) {
                resolve(elements);
            } else if (Date.now() - startTime > timeout) {
                reject(new Error('Elements not found within timeout'));
            } else {
                setTimeout(checkElements, 100);
            }
        }

        checkElements();
    });
}

// Wait for DOM and then for dynamic elements
document.addEventListener("DOMContentLoaded", function () {
    // Wait for the share elements to be created dynamically
    waitForElements({
        shareToggle: '.share-toggle',
        shareHidden: '.share-hidden',
        copyBtn: '.copy-url'
    }).then(elements => {
        const { shareToggle, shareHidden, copyBtn } = elements;

        // Toggle the hidden share options
        shareToggle.addEventListener("click", function () {
            shareHidden.classList.toggle("active");
            shareHidden.classList.remove("hidden"); // Ensure hidden class is removed
        });

        // Copy current page URL to clipboard
        copyBtn.addEventListener("click", function () {
            const url = window.location.href;

            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(url).then(() => {
                    copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                    setTimeout(() => {
                        copyBtn.innerHTML = '<i class="fas fa-link"></i>';
                    }, 1500);
                }).catch(err => {
                    console.error("Failed to copy: ", err);
                    fallbackCopy(url, copyBtn);
                });
            } else {
                fallbackCopy(url, copyBtn);
            }
        });

        // Setup social share links
        setupSocialShareLinks();

    }).catch(err => {
        console.error("Share elements not found:", err);
    });
});

function setupSocialShareLinks() {
    // Wait a bit more for title to be set
    setTimeout(() => {
        const pageUrl = encodeURIComponent(window.location.href);
        const pageTitle = encodeURIComponent(document.title);

        const shareLinks = {
            '.share-facebook': `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`,
            '.share-twitter': `https://twitter.com/intent/tweet?url=${pageUrl}&text=${pageTitle}`,
            '.share-linkedin': `https://www.linkedin.com/shareArticle?mini=true&url=${pageUrl}&title=${pageTitle}`,
            '.share-whatsapp': `https://api.whatsapp.com/send?text=${pageTitle}%20${pageUrl}`,
            '.share-telegram': `https://t.me/share/url?url=${pageUrl}&text=${pageTitle}`,
            '.share-reddit': `https://www.reddit.com/submit?url=${pageUrl}&title=${pageTitle}`,
            '.share-pinterest': `https://pinterest.com/pin/create/button/?url=${pageUrl}&description=${pageTitle}`
        };

        Object.entries(shareLinks).forEach(([selector, href]) => {
            const element = document.querySelector(selector);
            if (element) {
                element.href = href;
            }
        });
    }, 500);
}

function fallbackCopy(text, button) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        document.execCommand('copy');
        button.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
            button.innerHTML = '<i class="fas fa-link"></i>';
        }, 1500);
    } catch (err) {
        console.error('Fallback copy failed:', err);
    }

    document.body.removeChild(textArea);
}