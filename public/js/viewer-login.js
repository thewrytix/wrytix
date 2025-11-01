document.addEventListener("DOMContentLoaded", () => {
    const loginModal = document.getElementById("loginModal");
    const signupModal = document.getElementById("signupModal");
    const loginBtn = document.getElementById("loginBtn");
    const closes = document.querySelectorAll(".close");

    // Open login modal
    loginBtn.addEventListener("click", () => {
        loginModal.style.display = "flex"; // flex centers content
    });

    // Switch to signup
    document.getElementById("switch-to-signup").addEventListener("click", (e) => {
        e.preventDefault();
        loginModal.style.display = "none";
        signupModal.style.display = "flex";
    });

    // Switch back to login
    document.getElementById("switch-to-login").addEventListener("click", (e) => {
        e.preventDefault();
        signupModal.style.display = "none";
        loginModal.style.display = "flex";
    });

    // Close on X
    closes.forEach((close) => {
        close.addEventListener("click", () => {
            loginModal.style.display = "none";
            signupModal.style.display = "none";
        });
    });

    // Close if clicking *outside* modal content
    window.addEventListener("click", (e) => {
        if (e.target === loginModal) loginModal.style.display = "none";
        if (e.target === signupModal) signupModal.style.display = "none";
    });
});
