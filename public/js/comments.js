// Enhanced Comments Script Using Backend (JSON API) - SECURE VERSION
document.addEventListener("DOMContentLoaded", () => {
    // Check if SecurityUtils is available
    if (typeof SecurityUtils === 'undefined') {
        console.error('SecurityUtils not loaded! Comments system disabled.');
        return;
    }

    const commentBox = document.querySelector(".comment-box");
    if (!commentBox) return;

    const nameInput = commentBox.querySelector("#username");
    const textarea = commentBox.querySelector("#commentText");
    const button = commentBox.querySelector(".comment-button");
    const commentsContainer = commentBox.querySelector(".comments-list");

    const COMMENTS_PER_LOAD = 5;
    let visibleCount = 0;
    let allComments = [];

    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug");

    if (!slug) {
        console.log('No slug found in URL');
        return;
    }

    const timeAgo = (time) => {
        const now = new Date();
        const seconds = Math.floor((now - time) / 1000);
        if (seconds < 5) return "Just now";
        if (seconds < 60) return `${seconds} seconds ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
        const days = Math.floor(hours / 24);
        return `${days} day${days !== 1 ? "s" : ""} ago`;
    };

    const displayComments = () => {
        commentsContainer.innerHTML = "";
        const toDisplay = allComments.slice(0, visibleCount);

        toDisplay.forEach(({ username, comment, timestamp }) => {
            const div = document.createElement("div");
            div.className = "comment";

            // ✅ SECURE: Use safeFormat for username/timestamp, safeFormatWithLines for comment
            div.innerHTML = `
                <strong>${SecurityUtils.escapeHtml(username)}</strong>
                <em data-timestamp="${timestamp}">${timeAgo(new Date(timestamp))}</em>
                <p>${SecurityUtils.escapeHtmlWithLines(comment)}</p>
            `;

            commentsContainer.appendChild(div);
        });

        // Load More Button
        if (visibleCount < allComments.length && !commentBox.querySelector(".load-more-comments")) {
            const loadMore = document.createElement("button");
            loadMore.className = "load-more-comments";
            loadMore.textContent = "Load More Comments";
            loadMore.addEventListener("click", () => {
                visibleCount = Math.min(visibleCount + COMMENTS_PER_LOAD, allComments.length);
                displayComments();
            });
            commentBox.appendChild(loadMore);
        }

        // Comments header
        const header = commentBox.querySelector(".comments-header") || document.createElement("h4");
        header.className = "comments-header";
        header.textContent = `${allComments.length} Comment${allComments.length !== 1 ? "s" : ""}`;
        if (!header.parentElement) commentBox.insertBefore(header, commentsContainer);

        updateTimestamps();
    };

    const updateTimestamps = () => {
        document.querySelectorAll("[data-timestamp]").forEach(el => {
            const ts = new Date(el.getAttribute("data-timestamp"));
            el.textContent = timeAgo(ts);
        });
    };

    const fetchComments = async () => {
        try {
            const res = await fetch(`https://wrytix.onrender.com/comments?slug=${encodeURIComponent(slug)}`);
            if (!res.ok) throw new Error('Failed to fetch comments');

            const data = await res.json();
            allComments = data.reverse();
            visibleCount = Math.min(COMMENTS_PER_LOAD, allComments.length);
            displayComments();
        } catch (err) {
            console.error("Failed to fetch comments:", err);
            commentsContainer.innerHTML = '<p class="error">Unable to load comments.</p>';
        }
    };

    const postComment = async () => {
        const rawUsername = nameInput.value.trim() || "Anonymous";
        const rawComment = textarea.value.trim();
        const timestamp = new Date().toISOString();

        // ✅ SECURE: Sanitize input first
        const username = SecurityUtils.sanitizeInput(rawUsername, { maxLength: 50 });
        const comment = SecurityUtils.sanitizeInput(rawComment, { maxLength: 500 });

        // Validation checks
        if (!comment) {
            alert("Please enter a comment before submitting.");
            return;
        }

        if (comment.length > 500) {
            alert("Comment too long. Maximum 500 characters allowed.");
            return;
        }

        try {
            const res = await fetch("https://wrytix.onrender.com/comments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    slug: SecurityUtils.escapeHtml(slug),
                    username: username, // Already sanitized, don't escape again
                    comment: comment,   // Already sanitized, don't escape again
                    timestamp
                })
            });

            if (res.ok) {
                nameInput.value = "";
                textarea.value = "";
                await fetchComments();
            } else {
                alert("Failed to post comment. Please try again.");
            }
        } catch (err) {
            console.error("Error posting comment:", err);
            alert("Network error. Please check your connection and try again.");
        }
    };

    // Event listeners
    if (button) {
        button.addEventListener("click", postComment);
    }

    // Allow Enter key to submit comment (but Shift+Enter for new line)
    if (textarea) {
        textarea.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                postComment();
            }
        });
    }

    // Initialize
    fetchComments();
    setInterval(updateTimestamps, 30000);
});