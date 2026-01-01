document.addEventListener("DOMContentLoaded", () => {

    /* =================== SIDEBAR LISTS =================== */
    const sidebarLists = document.querySelectorAll(".sidebar-section ul");

    sidebarLists.forEach(list => {
        for (let i = 0; i < 9; i++) { // 5 skeleton items
            const li = document.createElement("li");
            li.className = "skeleton";
            li.innerHTML = `<div class="text-skeleton skeleton"></div>`;
            list.appendChild(li);
        }
    });

    /* =================== FETCH API DATA =================== */
    async function loadContent() {
        try {
            // Single fetch for all data (no redundancy)
            const response = await fetch('https://wrytix.onrender.com/posts');
            if (!response.ok) throw new Error(`API error: ${response.status}`);
            const allData = await response.json(); // Expect: {featured: {large: {}, small: []}, categories: {...}, sidebar: {...}}


            // Inject Sidebar
            sidebarLists.forEach(list => {
                const listId = list.id;
                const items = allData.sidebar?.[listId] || [];
                items.forEach(item => {
                    const li = document.createElement("li");
                    li.innerHTML = `<a href="${item.link}">${item.title}</a> <span>${item.date}</span>`;
                    list.appendChild(li);
                });
            });

        } catch (error) {
            console.error('Content load failed:', error);
            // Always remove skeletons on error + show retry
            document.querySelectorAll('.skeleton').forEach(el => {
                el.style.opacity = '0';
                setTimeout(() => el.remove(), 300);
            });
            // Add error UI (append to body or a section)
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'padding: 20px; background: #ffebee; color: #d32f2f; text-align: center; margin: 20px; border-radius: 8px;';
            errorDiv.innerHTML = '<p>Oops! Failed to load content. <button onclick="location.reload()" style="background: #d32f2f; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Retry Now</button></p>';
            document.body.insertBefore(errorDiv, document.body.firstChild);
        }
    }

    loadContent();

});
