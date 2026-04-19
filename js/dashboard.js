(function () {
    'use strict';

    let allSavedWords = [];
    let filteredWords = [];
    let quizWords = [];
    let quizIndex = 0;
    let quizScore = 0;
    let vocabChart = null;
    let fcWords = [];
    let fcIndex = 0;
    let fcFlipped = false;

    document.addEventListener('DOMContentLoaded', async () => {
        await loadUser();
        await Promise.all([
            loadStats(),
            loadRecentSongs(),
            loadSavedWords(),
        ]);
    });

    async function loadUser() {
        try {
            const res = await fetch('/api/current-user');
            if (!res.ok) return;
            const data = await res.json();
            if (data.success && data.user) {
                const name = data.user.first_name || data.user.username || 'there';
                document.getElementById('welcomeTitle').textContent = `Welcome back, ${name}!`;
            }
        } catch (_) {}
    }

    async function loadStats() {
        try {
            const res = await fetch('/api/dashboard/stats');
            if (!res.ok) return;
            const data = await res.json();
            if (data.success) {
                animateCounter('statSavedWords', data.savedWords ?? 0);
                animateCounter('statSongsCompleted', data.songsCompleted ?? 0);
            }
        } catch (_) {
            document.getElementById('statSavedWords').textContent = '0';
            document.getElementById('statSongsCompleted').textContent = '0';
        }
    }

    function animateCounter(id, target) {
        const el = document.getElementById(id);
        if (!el) return;
        let current = 0;
        const step = Math.ceil(target / 30);
        const timer = setInterval(() => {
            current = Math.min(current + step, target);
            el.textContent = current;
            if (current >= target) clearInterval(timer);
        }, 30);
    }

    async function loadRecentSongs() {
        const container = document.getElementById('recentSongsContainer');
        const loading = document.getElementById('recentSongsLoading');
        const empty = document.getElementById('recentSongsEmpty');

        try {
            const res = await fetch('/api/dashboard/recent-songs');
            const data = await res.json();

            if (loading) loading.style.display = 'none';

            if (!data.success || !data.songs || data.songs.length === 0) {
                if (empty) empty.style.display = 'block';
                return;
            }

            const fragment = document.createDocumentFragment();
            data.songs.forEach(song => {
                fragment.appendChild(buildSongItem(song));
            });

            container.innerHTML = '';
            container.appendChild(fragment);

        } catch (err) {
            console.error('Recent songs error:', err);
            if (loading) loading.style.display = 'none';
            if (empty) empty.style.display = 'block';
        }
    }

    function buildSongItem(song) {
        const item = document.createElement('div');
        item.className = 'recent-song-item';

        const diffClass = {
            beginner: 'difficulty-beginner',
            intermediate: 'difficulty-intermediate',
            advanced: 'difficulty-advanced'
        }[song.difficulty] || 'difficulty-beginner';

        const diffLabel = song.difficulty
            ? song.difficulty.charAt(0).toUpperCase() + song.difficulty.slice(1)
            : '';

        item.innerHTML = `
            <div class="recent-song-info">
                <div class="recent-song-title">${escHtml(song.title)}</div>
                <div class="recent-song-meta">${escHtml(song.artist)}
                    ${song.language ? ` · <span class="badge badge-language ms-1">${escHtml(capitalise(song.language))}</span>` : ''}
                    ${song.difficulty ? `<span class="badge badge-difficulty ${diffClass} ms-1">${escHtml(diffLabel)}</span>` : ''}
                </div>
            </div>
            <a href="learn.html?id=${encodeURIComponent(song.id)}" class="btn btn-primary btn-sm flex-shrink-0">
                <i class="bi bi-play-fill me-1"></i>Continue
            </a>
        `;
        return item;
    }

    async function loadSavedWords() {
        const loading = document.getElementById('savedWordsLoading');
        const empty = document.getElementById('savedWordsEmpty');
        const tableWrapper = document.getElementById('savedWordsTableWrapper');
        const filterSelect = document.getElementById('filterSong');

        try {
            const res = await fetch('/api/dashboard/saved-words');
            const data = await res.json();
            loading.style.display = 'none';

            if (!data.success || !data.words || data.words.length === 0) {
                empty.style.display = 'block';
                renderVocabChart([]);
                return;
            }

            allSavedWords = data.words;
            filteredWords = [...allSavedWords];

            const songs = [...new Map(allSavedWords.map(w => [w.song_id, w.song_title])).entries()];
            songs.forEach(([id, title]) => {
                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = title;
                filterSelect.appendChild(opt);
            });

            filterSelect.addEventListener('change', () => {
                const val = filterSelect.value;
                filteredWords = val
                    ? allSavedWords.filter(w => String(w.song_id) === val)
                    : [...allSavedWords];
                renderWordsTable(filteredWords);
            });

            tableWrapper.style.display = 'block';
            document.getElementById('vocabActionBtns').style.display = 'flex';
            renderWordsTable(allSavedWords);
            renderVocabChart(allSavedWords);

        } catch (_) {
            loading.style.display = 'none';
            empty.style.display = 'block';
            renderVocabChart([]);
        }
    }

    function renderWordsTable(words) {
        const tbody = document.getElementById('savedWordsBody');
        tbody.innerHTML = '';

        if (words.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No words match this filter.</td></tr>`;
            return;
        }

        words.forEach(word => {
            const tr = document.createElement('tr');
            const savedDate = word.saved_at
                ? new Date(word.saved_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : '';

            tr.innerHTML = `
                <td class="word-cell">${escHtml(word.word)}</td>
                <td class="translation-cell">${escHtml(word.translation || '—')}</td>
                <td class="song-cell"><i class="bi bi-music-note me-1"></i>${escHtml(word.song_title || '—')}</td>
                <td class="date-cell">${savedDate}</td>
                <td>
                    <button class="btn-remove-word" title="Remove word" onclick="removeWord(${word.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    function renderVocabChart(words) {
        const canvas = document.getElementById('vocabGrowthChart');
        const emptyState = document.getElementById('vocabEmptyState');

        if (!words || words.length === 0) {
            canvas.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        const byDate = {};
        words.forEach(w => {
            if (!w.saved_at) return;
            const d = new Date(w.saved_at).toISOString().split('T')[0];
            byDate[d] = (byDate[d] || 0) + 1;
        });

        const sortedDates = Object.keys(byDate).sort();
        const labels = [];
        const counts = [];
        let cumulative = 0;

        sortedDates.forEach(d => {
            cumulative += byDate[d];
            labels.push(new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }));
            counts.push(cumulative);
        });

        if (vocabChart) vocabChart.destroy();

        vocabChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Total Words Saved',
                    data: counts,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102,126,234,0.08)',
                    borderWidth: 2.5,
                    pointBackgroundColor: '#667eea',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` ${ctx.parsed.y} words saved`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#aaa', font: { size: 12 } }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: '#f0f0f0' },
                        ticks: {
                            color: '#aaa',
                            font: { size: 12 },
                            stepSize: 1,
                            precision: 0
                        }
                    }
                }
            }
        });
    }

    window.removeWord = async function (wordId) {
        try {
            const res = await fetch(`/api/dashboard/saved-words/${wordId}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                allSavedWords = allSavedWords.filter(w => w.id !== wordId);
                filteredWords = filteredWords.filter(w => w.id !== wordId);
                renderWordsTable(filteredWords);
                renderVocabChart(allSavedWords);
                animateCounter('statSavedWords', allSavedWords.length);
            }
        } catch (_) {}
    };

    window.openQuiz = function () {
        const source = filteredWords.length > 0 ? filteredWords : allSavedWords;
        if (source.length < 2) {
            alert('You need at least 2 saved words to take a quiz!');
            return;
        }

        quizWords = shuffle([...source]);
        quizIndex = 0;
        quizScore = 0;

        const modal = new bootstrap.Modal(document.getElementById('quizModal'));
        modal.show();
        renderQuizQuestion();
    };

    function renderQuizQuestion() {
        const body = document.getElementById('quizBody');
        const current = quizWords[quizIndex];
        const total = quizWords.length;
        const progress = ((quizIndex) / total) * 100;

        const others = allSavedWords.filter(w => w.id !== current.id && w.translation);
        const wrongOptions = shuffle(others).slice(0, 3).map(w => w.translation);
        const correctAnswer = current.translation || current.word;
        const options = shuffle([correctAnswer, ...wrongOptions]);

        body.innerHTML = `
            <div class="quiz-progress-bar">
                <div class="quiz-progress-fill" style="width:${progress}%"></div>
            </div>
            <div class="text-center mb-1 text-muted small">Question ${quizIndex + 1} of ${total}</div>
            <div class="quiz-word-display">
                <div class="quiz-word">${escHtml(current.word)}</div>
                <div class="quiz-song-hint">from <em>${escHtml(current.song_title || 'a song')}</em></div>
            </div>
            <p class="text-center text-muted small mb-3">What does this word mean?</p>
            <div class="quiz-options">
                ${options.map(opt => `
                    <button class="quiz-option" onclick="handleQuizAnswer(this, '${escAttr(opt)}', '${escAttr(correctAnswer)}')">
                        ${escHtml(opt)}
                    </button>
                `).join('')}
            </div>
        `;
    }

    window.handleQuizAnswer = function (btn, chosen, correct) {
        document.querySelectorAll('.quiz-option').forEach(b => b.disabled = true);

        if (chosen === correct) {
            btn.classList.add('correct');
            quizScore++;
        } else {
            btn.classList.add('wrong');
            document.querySelectorAll('.quiz-option').forEach(b => {
                if (b.textContent.trim() === correct) b.classList.add('correct');
            });
        }

        setTimeout(() => {
            quizIndex++;
            if (quizIndex < quizWords.length) {
                renderQuizQuestion();
            } else {
                renderQuizResult();
            }
        }, 900);
    };

    function renderQuizResult() {
        const body = document.getElementById('quizBody');
        const pct = Math.round((quizScore / quizWords.length) * 100);
        const message = pct === 100
            ? 'Perfect score! '
            : pct >= 70
                ? 'Great work! Keep it up '
                : "Keep practising — you'll get there! ";

        body.innerHTML = `
            <div class="quiz-result">
                <div class="quiz-score-circle">${pct}%</div>
                <p class="fw-bold mb-1">${message}</p>
                <p class="quiz-score-label">You got ${quizScore} out of ${quizWords.length} correct</p>
                <div class="d-flex gap-2 justify-content-center">
                    <button class="btn btn-primary" onclick="openQuiz()">Try Again</button>
                    <button class="btn btn-outline-secondary" data-bs-dismiss="modal">Done</button>
                </div>
            </div>
        `;
    }

    window.openFlashcards = function () {
        const source = filteredWords.length > 0 ? filteredWords : allSavedWords;
        if (source.length === 0) {
            alert('You need at least one saved word to use flashcards!');
            return;
        }
        fcWords = shuffle([...source]);
        fcIndex = 0;
        fcFlipped = false;
        const modal = new bootstrap.Modal(document.getElementById('flashcardModal'));
        modal.show();
        renderFlashcard();
    };

    function renderFlashcard() {
        const body = document.getElementById('flashcardBody');
        const word = fcWords[fcIndex];
        const total = fcWords.length;
        const progress = (fcIndex / total) * 100;

        body.innerHTML = `
            <div class="fc-progress-bar"><div class="fc-progress-fill" style="width:${progress}%"></div></div>
            <div class="fc-counter">${fcIndex + 1} / ${total}</div>
            <div class="fc-scene" id="fcScene" onclick="flipCard()">
                <div class="fc-card" id="fcCard">
                    <div class="fc-face fc-front">
                        <div class="fc-word">${escHtml(word.word)}</div>
                        <div class="fc-song"><i class="bi bi-music-note me-1"></i>${escHtml(word.song_title || 'a song')}</div>
                    </div>
                    <div class="fc-face fc-back">
                        <div class="fc-hint">Translation</div>
                        <div class="fc-translation">${escHtml(word.translation || '—')}</div>
                        <div class="fc-word-small">${escHtml(word.word)}</div>
                    </div>
                </div>
            </div>
            <div class="fc-nav">
                <button class="btn btn-outline-secondary btn-sm fc-btn" onclick="fcPrev()" ${fcIndex === 0 ? 'disabled' : ''}>
                    <i class="bi bi-arrow-left me-1"></i>Prev
                </button>
                <button class="btn btn-outline-secondary btn-sm fc-btn" onclick="flipCard()">
                    <i class="bi bi-arrow-repeat me-1"></i>Flip
                </button>
                ${fcIndex < total - 1
                    ? `<button class="btn btn-primary btn-sm fc-btn" onclick="fcNext()">Next<i class="bi bi-arrow-right ms-1"></i></button>`
                    : `<button class="btn btn-success btn-sm fc-btn" onclick="fcDone()">Done<i class="bi bi-check2 ms-1"></i></button>`
                }
            </div>
        `;
        fcFlipped = false;
    }

    window.flipCard = function () {
        const card = document.getElementById('fcCard');
        if (!card) return;
        fcFlipped = !fcFlipped;
        card.classList.toggle('is-flipped', fcFlipped);
    };

    window.fcNext = function () {
        if (fcIndex < fcWords.length - 1) { fcIndex++; renderFlashcard(); }
    };

    window.fcPrev = function () {
        if (fcIndex > 0) { fcIndex--; renderFlashcard(); }
    };

    window.fcDone = function () {
        const body = document.getElementById('flashcardBody');
        body.innerHTML = `
            <div class="fc-done">
                <div class="fc-done-icon">🎉</div>
                <p class="fw-bold mb-1">All done!</p>
                <p class="text-muted small mb-3">You reviewed ${fcWords.length} word${fcWords.length !== 1 ? 's' : ''}.</p>
                <div class="d-flex gap-2 justify-content-center">
                    <button class="btn btn-primary btn-sm" onclick="openFlashcards()">Study Again</button>
                    <button class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        `;
    };

    function escHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function escAttr(str) {
        if (!str) return '';
        return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }

    function capitalise(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

})();