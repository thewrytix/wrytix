// Function to wait for elements to be available
function waitForShareElements() {
    return new Promise((resolve) => {
        const checkElements = () => {
            const shareToggle = document.querySelector(".share-toggle");
            const shareHidden = document.querySelector(".share-hidden");
            const copyBtn = document.querySelector(".copy-url");

            if (shareToggle && shareHidden && copyBtn) {
                resolve({ shareToggle, shareHidden, copyBtn });
            } else {
                // Check again after 100ms
                setTimeout(checkElements, 100);
            }
        };
        checkElements();
    });
}

// Initialize share functionality when DOM is ready
document.addEventListener("DOMContentLoaded", async function () {
    // Wait for the share elements to be created by view-post.js
    const { shareToggle, shareHidden, copyBtn } = await waitForShareElements();

    // Toggle the hidden share options
    shareToggle.addEventListener("click", function () {
        shareHidden.classList.toggle("active");
        // Remove hidden class to show the elements
        shareHidden.classList.remove("hidden");
    });

    // Copy current page URL to clipboard
    copyBtn.addEventListener("click", function () {
        const url = window.location.href;

        // Check if clipboard API is available (HTTPS required)
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(url).then(() => {
                copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="fas fa-link"></i>';
                }, 1500);
            }).catch(err => {
                console.error("Failed to copy: ", err);
                // Fallback if clipboard fails
                fallbackCopyText(url, copyBtn);
            });
        } else {
            // Fallback for non-HTTPS or unsupported browsers
            fallbackCopyText(url, copyBtn);
        }
    });

    // Setup social media share links
    setupSocialShareLinks();
});

// Fallback copy function for non-HTTPS sites
function fallbackCopyText(text, button) {
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
        alert('Link copied to clipboard!');
    } catch (err) {
        console.error('Fallback copy failed:', err);
        alert('Could not copy link. Please copy manually: ' + text);
    }

    document.body.removeChild(textArea);
}

// Setup social media share links
function setupSocialShareLinks() {
    // Wait a bit for the page title to be set
    setTimeout(() => {
        const pageUrl = encodeURIComponent(window.location.href);
        const pageTitle = encodeURIComponent(document.title);

        // Update share links
        const facebookShare = document.querySelector(".share-facebook");
        if (facebookShare) {
            facebookShare.href = `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`;
        }

        const twitterShare = document.querySelector(".share-twitter");
        if (twitterShare) {
            twitterShare.href = `https://twitter.com/intent/tweet?url=${pageUrl}&text=${pageTitle}`;
        }

        const linkedinShare = document.querySelector(".share-linkedin");
        if (linkedinShare) {
            linkedinShare.href = `https://www.linkedin.com/shareArticle?mini=true&url=${pageUrl}&title=${pageTitle}`;
        }

        const whatsappShare = document.querySelector(".share-whatsapp");
        if (whatsappShare) {
            whatsappShare.href = `https://api.whatsapp.com/send?text=${pageTitle}%20${pageUrl}`;
        }

        const telegramShare = document.querySelector(".share-telegram");
        if (telegramShare) {
            telegramShare.href = `https://t.me/share/url?url=${pageUrl}&text=${pageTitle}`;
        }

        const redditShare = document.querySelector(".share-reddit");
        if (redditShare) {
            redditShare.href = `https://www.reddit.com/submit?url=${pageUrl}&title=${pageTitle}`;
        }

        const pinterestShare = document.querySelector(".share-pinterest");
        if (pinterestShare) {
            pinterestShare.href = `https://pinterest.com/pin/create/button/?url=${pageUrl}&description=${pageTitle}`;
        }

    }, 1000); // Wait 1 second for title to be set
}