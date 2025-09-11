document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("loginModal");
    const loginBtn = document.getElementById("loginBtn");
    const closeBtn = modal.querySelector(".close");

    // Open modal
    loginBtn.addEventListener("click", () => {
        modal.style.display = "flex";
    });

    // Close modal on X
    closeBtn.addEventListener("click", () => {
        modal.style.display = "none";
    });

    // Close only if clicking *outside* modal content
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.style.display = "none";
        }
    });
});
