class FootballStandingsManager {
    constructor() {
        this.leagues = [
            { id: 'PL', name: "🇬🇧 Premier League" },
            { id: 'PD', name: "🇪🇸 La Liga" },
            { id: 'SA', name: "🇮🇹 Serie A" },
            { id: 'BL1', name: "🇩🇪 Bundesliga" },
            { id: 'FL1', name: "🇫🇷 Ligue 1" }
        ];
        this.container = document.getElementById("football-leagues");
        this.updatedElement = document.getElementById("sports-updated");
        this.currentIndex = 0;
        this.standingsData = [];
        this.touchStartX = 0;
        this.touchEndX = 0;
    }

    async fetchStandings() {
        this.container.innerHTML = '<div class="loading">Loading league standings...</div>';
        this.standingsData = [];

        for (const league of this.leagues) {
            try {
                const res = await fetch(`https://wrytix.onrender.com/standings/${league.id}`);
                const data = await res.json();
                this.standingsData.push({ league, data });
            } catch (err) {
                this.standingsData.push({
                    league,
                    data: { standings: [{ table: [] }], error: `Error: ${err.message}` }
                });
            }
        }

        this.renderLeague(this.currentIndex);
        this.updateTimestamp();
    }

    renderLeague(index) {
        const leagueData = this.standingsData[index];
        if (!leagueData) return;

        const { league, data } = leagueData;
        const standings = data.standings?.[0]?.table || [];
        let html = '';

        if (!standings.length) {
            html += this.createLeagueError(league.name, data.error || 'No data available');
        } else {
            const tableRows = standings.slice(0, 20).map((team, i) => `
                <tr ${i < 4 ? 'style="background: #f0f8f0;"' : ''}>
                    <td class="position">${team.position}</td>
                    <td class="team-name">
                        ${team.team.crest ? `<img src="${team.team.crest}" class="team-logo" alt="${team.team.name}" onerror="this.style.display='none'">` : ''}
                        ${team.team.shortName || team.team.name}
                    </td>
                    <td class="stats">${team.playedGames}</td>
                    <td class="stats">${team.won}</td>
                    <td class="stats">${team.draw}</td>
                    <td class="stats">${team.lost}</td>
                    <td class="points">${team.points}</td>
                </tr>
            `).join("");

            html += `
                <div class="league-group">
                    <div class="league-header">${league.name}</div>
                    <div class="league-content">
                        <table class="standings-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Team</th>
                                    <th>MP</th>
                                    <th>W</th>
                                    <th>D</th>
                                    <th>L</th>
                                    <th>Pts</th>
                                </tr>
                            </thead>
                            <tbody>${tableRows}</tbody>
                        </table>
                        ${this.renderDots()}
                    </div>
                </div>
            `;
        }

        this.container.innerHTML = html;
        this.addDotListeners();
        this.addSwipeListeners();
    }

    renderDots() {
        return `
            <div class="pagination-dots">
                ${this.leagues.map((_, i) => `<span class="${i === this.currentIndex ? 'active' : ''}" data-index="${i}"></span>`).join('')}
            </div>
        `;
    }

    addDotListeners() {
        const dots = this.container.querySelectorAll('.pagination-dots span');
        dots.forEach(dot => {
            dot.addEventListener('click', e => {
                this.currentIndex = parseInt(e.target.dataset.index);
                this.renderLeague(this.currentIndex);
            });
        });
    }

    addSwipeListeners() {
        const leagueGroup = this.container.querySelector('.league-group');
        if (!leagueGroup) return;

        leagueGroup.addEventListener('touchstart', e => {
            this.touchStartX = e.changedTouches[0].screenX;
        });

        leagueGroup.addEventListener('touchend', e => {
            this.touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        });
    }

    handleSwipe() {
        const deltaX = this.touchEndX - this.touchStartX;
        if (Math.abs(deltaX) > 50) { // swipe threshold
            if (deltaX < 0) { // swipe left
                this.currentIndex = (this.currentIndex + 1) % this.leagues.length;
            } else { // swipe right
                this.currentIndex = (this.currentIndex - 1 + this.leagues.length) % this.leagues.length;
            }
            this.renderLeague(this.currentIndex);
        }
    }

    createLeagueError(name, message) {
        return `<div class="league-group">
            <div class="league-header">${name}</div>
            <div class="league-content">
                <div class="error">⚠️ ${message}</div>
            </div>
        </div>`;
    }

    updateTimestamp() {
        this.updatedElement.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    }

    startAutoRefresh() {
        setInterval(() => this.fetchStandings(), 3600000); // every 60 mins
    }

    init() {
        this.fetchStandings();
        this.startAutoRefresh();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const standingsManager = new FootballStandingsManager();
    standingsManager.init();
});
