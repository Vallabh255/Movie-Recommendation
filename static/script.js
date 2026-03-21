document.addEventListener('DOMContentLoaded', () => {
    const filterBtn = document.querySelector('.filterbtn');
    const filterMenu = document.getElementById('filterMenu');
    const resetBtn = document.getElementById('resetFilters');
    const filterForm = document.getElementById('filterForm');

    // --- Filter Menu Logic ---
    filterBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        filterMenu.classList.toggle('show');
    });

    filterMenu.addEventListener('click', (event) => {
        event.stopPropagation();
    });

    document.addEventListener('click', () => {
        filterMenu.classList.remove('show');
    });

    resetBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        const checkboxes = filterMenu.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
    });

    window.addEventListener('load', () => {
        const checkboxes = filterMenu.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
    });

    filterForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const formData = new FormData(this);
        const selectedGenres = formData.getAll('genre');
        const selectedCountries = formData.getAll('country');
        const selectedYears = formData.getAll('released');

        fetch('/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                genres: selectedGenres,
                countries: selectedCountries,
                released: selectedYears,
            }),
        })
        .then(res => res.json())
        .then(data => {
            console.log('Recommendations:', data);
        })
        .catch(err => {
            console.error('Error fetching recommendations:', err);
        });
    });

    // --- Search Logic ---
    const searchInput = document.querySelector('.searchInput');
    const searchBtn = document.querySelector('.okbtn');
    const loadingOverlay = document.getElementById('loadingOverlay');

    function showLoadingForTwoSeconds() {
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 2000);
        }
    }

    function performSearch() {
        const title = searchInput.value.trim();
        if (!title) {
            alert("Please enter a movie title.");
            return;
        }

        showLoadingForTwoSeconds();

        const url = `/smart_recommend?title=${encodeURIComponent(title)}&limit=10`;

        fetch(url)
            .then(res => {
                if (!res.ok) {
                    return res.json().then(err => {
                        throw new Error(err.error || "An unexpected error occurred.");
                    });
                }
                return res.json();
            })
            .then(data => {
                if (data.results && data.results.length > 0) {
                    const resultsContainer = document.getElementById('results');
                    resultsContainer.innerHTML = '';

                    data.results.forEach((movie, index) => {
                        const card = document.createElement('div');
                        card.className = `movie-card ${index === 0 ? 'selected-movie' : ''}`;

                        // 1. Selected Badge
                        if (index === 0) {
                            const badge = document.createElement('div');
                            badge.className = 'selected-badge';
                            badge.textContent = 'Selected';
                            card.appendChild(badge);
                        }

                        // 2. Poster Image
                        const img = document.createElement('img');
                        img.className = 'movie-poster';
                        img.src = `https://image.tmdb.org/t/p/w500${movie.poster_path || ''}`;
                        img.alt = movie.title || 'Poster';
                        img.onerror = function () {
                            this.onerror = null;
                            this.src = '/static/icons/fallback.svg';
                        };

                        // 3. Adult/18+ Logic
                        if (movie.adult) {
                            img.style.display = 'none';
                            const blackOverlay = document.createElement('div');
                            blackOverlay.className = 'black-overlay';
                            const badge18 = document.createElement('div');
                            badge18.className = 'badge-18';
                            badge18.textContent = '18+';
                            blackOverlay.appendChild(badge18);
                            card.appendChild(blackOverlay);
                        } else {
                            card.appendChild(img);
                        }

                        // 4. Movie Title
                        const movieTitle = document.createElement('h3');
                        movieTitle.textContent = movie.title || 'Untitled Movie';
                        card.appendChild(movieTitle);

                        // 5. Modal Click Handler
                        card.onclick = () => {
                            const overlay = document.getElementById('movieOverlay');
                            const content = document.getElementById('movieDetailContent');
                            overlay.classList.remove('hidden');
                            content.innerHTML = '<div class="spinner"></div>';

                            fetch(`/movie_detail?title=${encodeURIComponent(movie.title)}`)
                                .then(res => res.text())
                                .then(html => {
                                    content.innerHTML = html;
                                })
                                .catch(() => {
                                    content.innerHTML = 'Failed to load details.';
                                });
                        };

                        resultsContainer.appendChild(card);
                    });
                } else {
                    alert(data.error || data.message || "No results.");
                }
            })
            .catch(err => {
                console.error("Fetch error:", err);
                alert("Server error. Try again later.");
            });
    }

    searchBtn.addEventListener('click', performSearch);

    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            performSearch();
        }
    });

    // Close Popup Logic
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('close-popup')) {
            document.getElementById('movieOverlay').classList.add('hidden');
        }
    });
});