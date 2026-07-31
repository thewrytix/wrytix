window.RoleConfig = {
    admin: {
        title: 'Admin Dashboard',
        sidebar: [
            { label: 'Dashboard', icon: 'fa-gauge', href: '../dashboard/dashboard.html' },
            {
                label: 'Posts', icon: 'fa-newspaper',
                children: [
                    { label: 'All Posts', href: '../posts/posts.html?status=all' },
                  
                ]
            },
            { label: 'Ads', icon: 'fa-rectangle-ad',
                children: [
                    { label:' All Ads', href: '../ads/ads.html' },
                
                  ]},
            {
                label: 'Users', icon: 'fa-users',
                children: [
                    { label: 'All Users', href: '../users/users.html?status=all' },
                    { label: 'Categories', href: '../users/categories.html' },
                    { label: 'Analytics', href: '../users/analytics.html' }
                ]
            },
            {
                label: 'System', icon: 'fa-server',
                children: [
                    { label: 'Health', href: '../system/system-health.html' },
                    { label: 'Maintenance & Tasks', href: '../system/maintenance.html' },
                    { label: 'Logs', href: '../system/logs.html' }
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
            { label: 'Dashboard', href: '../dashboard/dashboard.html', icon: 'fa-gauge' },
            {
                label: 'Posts', icon: 'fa-newspaper',
                children: [
                    { label: 'Posts', href: '../posts/posts.html?status=all' },
                   
                ]
            },
            {
                label: 'Users', icon: 'fa-users',
                children: [
                    { label: 'My Submitted Users',href: '../users/users.html?status=all'  }
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
            { label: 'Dashboard', href: '../dashboard/dashboard.html', icon: 'fa-gauge' },
            { label: 'My Posts', href: '../posts/posts.html?status=all' },
        ],
        cards: [
            { id: 'totalPosts', label: 'Total Submitted' },
            { id: 'approved', label: 'Approved' },
            { id: 'pending', label: 'Pending' },
            { id: 'rejected', label: 'Rejected' }
        ]
    }
};