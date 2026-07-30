window.RoleConfig = {
    admin: {
        title: 'Admin Dashboard',
        sidebar: [
            { label: 'Dashboard', href: '/admin-panel/dashboard.html', icon: 'fa-gauge' },
            { label: 'Posts', href: '/admin-panel/posts/posts-list.html', icon: 'fa-newspaper' },
            { label: 'Ads', href: '/admin-panel/ads/ads-list.html', icon: 'fa-rectangle-ad' },
            { label: 'Users', href: '/admin-panel/users/users-list.html', icon: 'fa-users' },
            { label: 'System', href: '/admin-panel/system/system-health.html', icon: 'fa-server' }
        ],
        cards: [
            { id: 'totalPosts', label: 'Total Posts' },
            { id: 'livePosts', label: 'Live Posts' },
            { id: 'totalViews', label: 'Total Views' },
            { id: 'totalUsers', label: 'Total Users' },
            { id: 'pendingUsers', label: 'Pending Approvals' },
            { id: 'pendingApprovals', label: 'Post Approvals' },
            { id: 'totalAds', label: 'Total Ads' },
            { id: 'activeAds', label: 'Active Ads' },
            { id: 'visitsToday', label: 'Visits Today' }
        ]
    },
    editor: {
        title: 'Editor Dashboard',
        sidebar: [
            { label: 'Dashboard', href: '/editor-panel/dashboard.html', icon: 'fa-gauge' },
            { label: 'Posts', href: '/editor-panel/posts/posts-list.html', icon: 'fa-newspaper' },
            { label: 'Users', href: '/editor-panel/users/my-submitted-users.html', icon: 'fa-users' }
        ],
        cards: [
            { id: 'totalPosts', label: 'Total Posts' },
            { id: 'livePosts', label: 'Live Posts' },
            { id: 'totalViews', label: 'Total Views' },
            { id: 'pendingApprovals', label: 'Pending Approvals' },
            { id: 'myAuthorsCount', label: 'My Authors' }
        ]
    },
    author: {
        title: 'Author Dashboard',
        sidebar: [
            { label: 'Dashboard', href: '/author-panel/dashboard.html', icon: 'fa-gauge' },
            { label: 'Posts', href: '/author-panel/posts/my-posts.html', icon: 'fa-newspaper' }
        ],
        cards: [
            { id: 'totalPosts', label: 'Total Submitted' },
            { id: 'approved', label: 'Approved' },
            { id: 'pending', label: 'Pending' },
            { id: 'rejected', label: 'Rejected' }
        ]
    }
};