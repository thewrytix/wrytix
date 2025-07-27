// Enhanced Comments Script Using Backend (JSON API)
document.addEventListener("DOMContentLoaded", () => {
    const commentBox = document.querySelector(".comment-box");
    const nameInput = commentBox.querySelector("#username");
    const textarea = commentBox.querySelector("#commentText");
    const button = commentBox.querySelector(".comment-button");
    const commentsContainer = commentBox.querySelector(".comments-list");

    const COMMENTS_PER_LOAD = 5;
    let visibleCount = 0;
    let allComments = [];

    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug");

    if (!slug) return;

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
            div.innerHTML = `
                <strong>${username}</strong>
                <em data-timestamp="${timestamp}">${timeAgo(new Date(timestamp))}</em>
                <p>${comment}</p>
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
            const res = await fetch(`http://localhost:3000/comments?slug=${slug}`);
            const data = await res.json();
            allComments = data.reverse();
            visibleCount = Math.min(COMMENTS_PER_LOAD, allComments.length);
            displayComments();
        } catch (err) {
            console.error("Failed to fetch comments:", err);
        }
    };

    const postComment = async () => {
        const username = nameInput.value.trim() || "Anonymous";
        const comment = textarea.value.trim();
        const timestamp = new Date().toISOString();

        if (!comment) return;

        try {
            const res = await fetch("http://localhost:3000/comments", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ slug, username, comment, timestamp })
            });

            if (res.ok) {
                nameInput.value = "";
                textarea.value = "";
                await fetchComments();
            } else {
                alert("Failed to post comment");
            }
        } catch (err) {
            console.error("Error posting comment:", err);
        }
    };

    button.addEventListener("click", postComment);
    fetchComments();
    setInterval(updateTimestamps, 10000);
});
