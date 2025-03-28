export class HighScores {
    constructor() {
        this.scores = this.loadScores();
        this.createHighScoreScreen();
        this.setupKeyboardEvents();
    }

    loadScores() {
        const saved = localStorage.getItem('snakeHighScores');
        if (saved) {
            return JSON.parse(saved).map(score => ({
                ...score,
                date: new Date(score.date)
            }));
        }
        return [];
    }

    saveScore(score, difficulty) {
        const newScore = {
            score,
            difficulty,
            date: new Date(),
            timestamp: Date.now()
        };

        this.scores.push(newScore);
        this.scores.sort((a, b) => b.score - a.score);
        this.scores = this.scores.slice(0, 10); // Keep top 10
        
        localStorage.setItem('snakeHighScores', JSON.stringify(this.scores));
        return this.isHighScore(score);
    }

    isHighScore(score) {
        return this.scores.length < 10 || score > this.scores[this.scores.length - 1].score;
    }

    createHighScoreScreen() {
        this.screen = document.createElement('div');
        this.screen.className = 'menu high-score-screen';
        this.screen.innerHTML = `
            <div class="menu-content">
                <h2>High Scores</h2>
                <div class="high-score-filters">
                    <button class="active" data-difficulty="all">All</button>
                    <button data-difficulty="easy">Easy</button>
                    <button data-difficulty="medium">Medium</button>
                    <button data-difficulty="hard">Hard</button>
                </div>
                <div class="high-score-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Score</th>
                                <th>Difficulty</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody id="highScoreTableBody">
                        </tbody>
                    </table>
                </div>
                <button id="closeHighScores">Close</button>
            </div>
        `;
        document.body.appendChild(this.screen);
        this.setupEventListeners();
        this.hide();
    }

    updateHighScoreTable(difficulty = 'all') {
        const tbody = document.getElementById('highScoreTableBody');
        const filteredScores = difficulty === 'all' 
            ? this.scores 
            : this.scores.filter(score => score.difficulty === difficulty);

        tbody.innerHTML = filteredScores
            .slice(0, 10)
            .map((score, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${score.score}</td>
                    <td>${score.difficulty}</td>
                    <td>${score.date.toLocaleDateString()}</td>
                </tr>
            `)
            .join('');
    }

    setupEventListeners() {
        const filters = this.screen.querySelectorAll('.high-score-filters button');
        filters.forEach(button => {
            button.addEventListener('click', () => {
                filters.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                this.updateHighScoreTable(button.dataset.difficulty);
            });
        });

        this.screen.querySelector('#closeHighScores').addEventListener('click', () => {
            this.hide();
        });
    }

    setupKeyboardEvents() {
        // Add keyboard event listener
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.screen.style.display === 'flex') {
                this.hide();
            }
        });
    }

    show() {
        this.screen.style.display = 'flex';
        this.updateHighScoreTable('all');
    }

    hide() {
        this.screen.style.display = 'none';
    }
} 