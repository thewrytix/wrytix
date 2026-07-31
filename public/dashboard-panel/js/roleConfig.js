window.RoleConfig = {
    admin: {
        title: 'Admin Dashboard',
        sidebar: [
            { label: 'Dashboard', href: '../dashboard/dashboard.html', icon: 'fa-gauge' },
            {
                label: 'Posts', icon: 'fa-newspaper',
                children: [
                    { label: 'All Posts', href: '../posts/posts.html?status=all' },
                  
                ]
            },
            { label: 'Ads', href: '/admin-panel/ads/ads.html', icon: 'fa-rectangle-ad' },
            {
                label: 'Users', icon: 'fa-users',
                children: [
                    { label: 'All Users', href: '/admin-panel/users/users.html?status=all' },
                    { label: 'Pending Approval', href: '/admin-panel/users/users.html?status=pending' },
                    { label: 'Analytics', href: '/admin-panel/users/analytics.html' }
                ]
            },
            {
                label: 'System', icon: 'fa-server',
                children: [
                    { label: 'Health', href: '/admin-panel/system/system-health.html' },
                    { label: 'Maintenance & Tasks', href: '/admin-panel/system/maintenance.html' },
                    { label: 'Logs', href: '/admin-panel/system/logs.html' }
                ]
            }
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
            { label: 'Dashboard', href: '/dashboard/dashboard.html', icon: 'fa-gauge' },
            {
                label: 'Posts', icon: 'fa-newspaper',
                children: [
                    { label: 'All Posts', href: '/admin-panel/posts/posts.html?status=all' },
                    { label: 'Pending Approval', href: '/admin-panel/posts/posts.html?status=pending' }
                ]
            },
            {
                label: 'Users', icon: 'fa-users',
                children: [
                    { label: 'My Submitted Users', href: '/admin-panel/users/users.html?status=pending' }
                ]
            }
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
            { label: 'Dashboard', href: '/dashboard/dashboard.html', icon: 'fa-gauge' },
            { label: 'Posts', href: '/admin-panel/posts/posts.html', icon: 'fa-newspaper' }
        ],
        cards: [
            { id: 'totalPosts', label: 'Total Submitted' },
            { id: 'approved', label: 'Approved' },
            { id: 'pending', label: 'Pending' },
            { id: 'rejected', label: 'Rejected' }
        ]
    }
};