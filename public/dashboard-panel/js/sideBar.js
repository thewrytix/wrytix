/**
 * sideBar.js — shared sidebar renderer with collapsible groups and
 * a collapsible whole-sidebar (icon-only) mode, persisted in localStorage.
 */
function renderSidebar(links) {
    const container = document.getElementById('sidebarLinks');
    const currentPath = window.location.pathname + window.location.search;

    container.innerHTML = links.map((item, index) => {
        if (item.children) {
            const isOpenGroup = item.children.some(c => currentPath.startsWith(c.href.split('?')[0]));
            return `
                <li class="sidebar-group ${isOpenGroup ? 'open' : ''}">
                    <button class="sidebar-group-toggle" data-group="${index}" >
                        <i class="fa-solid ${item.icon}" id="sidebar-icons"></i>
                        <span class="sidebar-label" >${item.label}</span>
                        <i class="fa-solid fa-chevron-down sidebar-caret"></i>
                    </button>
                    <ul class="sidebar-submenu">
                        ${item.children.map(child => `
                            <li>
                                <a href="${child.href}" class="${currentPath === child.href ? 'active' : ''}"  > 
                                    ${child.label} 
                                </a>
                            </li>
                        `).join('')}
                    </ul>
                </li>
            `;
        }

        const isActive = currentPath.split('?')[0] === item.href.split('?')[0];
        return `
            <li>
                <a href="${item.href}" class="${isActive ? 'active' : ''}">
                    <i class="fa-solid ${item.icon}"></i>
                    <span class="sidebar-label">${item.label}</span>
                </a>
            </li>
        `;
    }).join('');

    // Wire up group toggles
    container.querySelectorAll('.sidebar-group-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.sidebar-group').classList.toggle('open');
        });
    });
}

/**
 * Sets up the whole-sidebar collapse toggle (icon-only mode).
 * Call this once per page, alongside renderSidebar.
 */
function setupSidebarCollapse() {
    const sidebar = document.querySelector('.admin-sidebar');
    const toggleBtn = document.getElementById('sidebarCollapseBtn');
    if (!sidebar || !toggleBtn) return;

    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (isCollapsed) sidebar.classList.add('collapsed');

    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
    });
}


/* =========================================================
   Copyright Year Updater
   ========================================================= */

(function updateCopyright() {
    const el = document.querySelector('p.copyright');
    if (!el) return;
    const year = new Date().getFullYear();
    el.innerHTML = `&copy; ${year} Wrytix. All rights reserved.`;
})();