window.RoleConfig = {
    admin: {
        title: 'Admin Dashboard',
        sidebar: [
            { label: 'Admin Dashboard', href: '/admin-panel/dashboard.html' },
            { label: 'Post Dashboard', href: '/admin-panel/post-management/post-dashboard.html' },
            { label: 'Posts List', href: '/admin-panel/post-management/posts-list.html' },
            { label: 'Add Post', href: '/admin-panel/post-management/add-post.html' },
            { label: 'Ad Dashboard', href: '/admin-panel/ad-management/ads-dashboard.html' },
            { label: 'Ads List', href: '/admin-panel/ad-management/ads-list.html' },
            { label: 'User Dashboard', href: '/admin-panel/user-management/user-dashboard.html' },
            { label: 'Logs', href: '/admin-panel/user-management/logs.html' }
        ],
        cards: [
            { id: 'totalPosts', label: 'Total Posts' },
            { id: 'livePosts', label: 'Live Posts' },
            { id: 'scheduledPosts', label: 'Scheduled Posts' },
            { id: 'totalViews', label: 'Total Views' },
            { id: 'totalUsers', label: 'Total Users' },
            { id: 'pendingUsers', label: 'Pending Approvals' },
            { id: 'totalAds', label: 'Total Ads' },
            { id: 'activeAds', label: 'Active Ads' }
        ]
    },
    editor: {
        title: 'Editor Dashboard',
        sidebar: [
            { label: 'Dashboard', href: '/editor-panel/dashboard.html' },
            { label: 'Manage Posts', href: '/editor-panel/editor-posts.html' },
            { label: 'Post Approval Requests', href: '/editor-panel/editor-posts-approval.html' },
            { label: 'Add New Post', href: '/editor-panel/editor-add-post.html' }
        ],
        cards: [
            { id: 'totalPosts', label: 'Total Posts' },
            { id: 'livePosts', label: 'Live Posts' },
            { id: 'scheduledPosts', label: 'Scheduled Posts' },
            { id: 'totalViews', label: 'Total Views' },
            { id: 'pendingApprovals', label: 'Pending Approvals' }
        ]
    },
    author: {
        title: 'Author Dashboard',
        sidebar: [
            { label: 'Dashboard', href: '/author-panel/dashboard.html' },
            { label: 'Submit New Post', href: '/author-panel/author-add-post.html' },
            { label: 'My Posts', href: '/author-panel/author-posts.html' }
        ],
        cards: [
            { id: 'totalPosts', label: 'Total Submitted' },
            { id: 'approved', label: 'Approved' },
            { id: 'pending', label: 'Pending' },
            { id: 'rejected', label: 'Rejected' }
        ]
    }
};