async function loadDashboardData() {
    try {
        const res = await fetch('https://wrytix.onrender.com/ads');
        const ads = await res.json();

        const now = new Date();

        const total = ads.length;
        const active = ads.filter(ad => ad.active).length;
        const inactive = ads.filter(ad => !ad.active).length;
        const expired = ads.filter(ad => new Date(ad.endDate) < now).length;

        document.getElementById('totalAds').textContent = total;
        document.getElementById('activeAds').textContent = active;
        document.getElementById('inactiveAds').textContent = inactive;
        document.getElementById('expiredAds').textContent = expired;

        renderRecentAds(ads);
    } catch (err) {
        console.error('Failed to load dashboard data', err);
    }
}

function renderRecentAds(ads) {
    const tableBody = document.querySelector('#recentAdsTable tbody');
    tableBody.innerHTML = '';

    const recentAds = ads
        .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
        .slice(0, 5);

    if (recentAds.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6">No recent ads available.</td></tr>';
        return;
    }

    recentAds.forEach(ad => {
        const status = new Date(ad.endDate) < new Date()
            ? 'Expired'
            : (ad.active ? 'Active' : 'Inactive');

        const statusClass =
            status === 'Expired'
                ? 'status-expired'
                : status === 'Active'
                    ? 'status-active'
                    : 'status-inactive';

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${ad.type}</td>
          <td>${ad.company || '—'}</td>
          <td>${ad.category}</td>
          <td class="${statusClass}">${status}</td>
          <td>${ad.startDate?.split('T')[0] || ''}</td>
          <td>${ad.endDate?.split('T')[0] || ''}</td>
        `;
        tableBody.appendChild(tr);
    });
}

loadDashboardData();


async function showExpiringSoon() {
    const res = await fetch('https://wrytix.onrender.com/ads');
    const ads = await res.json();
    const body = document.getElementById("soonExpiringBody");
    const today = new Date();
    const soon = [];

    ads.forEach(ad => {
        const end = new Date(ad.endDate);
        const daysLeft = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 7 && daysLeft >= 0) {
            soon.push({
                ...ad,
                endsIn: daysLeft === 0 ? "Today" : `${daysLeft} day(s)`
            });
        }
    });

    body.innerHTML = '';
    if (soon.length === 0) {
        body.innerHTML = '<tr><td colspan="5">No ads expiring soon.</td></tr>';
        return;
    }

    soon.forEach(ad => {
        const row = document.createElement("tr");
        if (ad.endsIn.includes("1") || ad.endsIn === "Today") row.classList.add("highlight");
        row.innerHTML = `
        <td>${ad.company}</td>
        <td>${ad.type}</td>
        <td>${ad.category}</td>
        <td>${ad.endsIn}</td>
        <td>${ad.endDate}</td>
      `;
        body.appendChild(row);
    });
}

// Run when page loads
showExpiringSoon();