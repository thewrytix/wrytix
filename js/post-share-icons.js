
document.addEventListener("DOMContentLoaded", function () {
    const shareToggle = document.querySelector(".share-toggle");
    const shareHidden = document.querySelector(".share-hidden");
    const copyBtn = document.querySelector(".copy-url");

    // Toggle the hidden share options
    shareToggle.addEventListener("click", function () {
        shareHidden.classList.toggle("active");
    });

    // Copy current page URL to clipboard
    copyBtn.addEventListener("click", function () {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            copyBtn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                copyBtn.innerHTML = '<i class="fas fa-link"></i>';
            }, 1500);
        }).catch(err => {
            console.error("Failed to copy: ", err);
        });
    });
});

document.addEventListener("DOMContentLoaded", function () {
    const pageUrl = encodeURIComponent(window.location.href);
    const pageTitle = encodeURIComponent(document.title);

    document.querySelector(".share-facebook").href =
        `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`;

    document.querySelector(".share-twitter").href =
        `https://twitter.com/intent/tweet?url=${pageUrl}&text=${pageTitle}`;

    document.querySelector(".share-linkedin").href =
        `https://www.linkedin.com/shareArticle?mini=true&url=${pageUrl}&title=${pageTitle}`;

    document.querySelector(".share-whatsapp").href =
        `https://api.whatsapp.com/send?text=${pageTitle}%20${pageUrl}`;

    document.querySelector(".share-telegram").href =
        `https://t.me/share/url?url=${pageUrl}&text=${pageTitle}`;

    document.querySelector(".share-reddit").href =
        `https://www.reddit.com/submit?url=${pageUrl}&title=${pageTitle}`;

    document.querySelector(".share-pinterest").href =
        `https://pinterest.com/pin/create/button/?url=${pageUrl}&description=${pageTitle}`;
});