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

    // --- Search Logic & UI References ---
    const searchInput = document.querySelector('.searchInput');
    const searchBtn = document.querySelector('.okbtn');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const resultsContainer = document.getElementById('results');
    const scrollRightBtn = document.getElementById('scrollRight');
    const scrollLeftBtn = document.getElementById('scrollLeft'); 
    const viewAllBtn = document.getElementById('viewAllBtn');
    const resultsHeader = document.querySelector('.results-header');

    function showLoadingForTwoSeconds() {
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 2000);
        }
    }

    // --- View All Toggle Logic ---
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', () => {
            resultsContainer.classList.toggle('horizontal-scroll');
            resultsContainer.classList.toggle('grid-view');
            
            const isGridView = resultsContainer.classList.contains('grid-view');
            viewAllBtn.textContent = isGridView ? 'Show Less' : 'View All';
            
            // Hide arrows when Grid View is active
            const arrows = [scrollLeftBtn, scrollRightBtn];
            arrows.forEach(arrow => {
                if (arrow) {
                    if (isGridView) {
                        arrow.setAttribute('style', 'display: none !important');
                    } else {
                        arrow.setAttribute('style', 'display: flex !important');
                    }
                }
            });
        });
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
                resultsContainer.innerHTML = '';
                
                // Hide UI elements initially
                if (resultsHeader) resultsHeader.classList.remove('show-results');
                if (scrollLeftBtn) scrollLeftBtn.setAttribute('style', 'display: none !important');
                if (scrollRightBtn) scrollRightBtn.setAttribute('style', 'display: none !important');

                if (data.results && data.results.length > 0) {
                    // ✅ SUCCESS: Show Header
                    if (resultsHeader) resultsHeader.classList.add('show-results');
                    
                    // ✅ FIX: Check current view state before showing arrows
                    const isGridView = resultsContainer.classList.contains('grid-view');

                    // ✅ SUCCESS: Set Transparent Arrow Symbols and Show ONLY if NOT in grid view
                    if (scrollLeftBtn) {
                        scrollLeftBtn.innerHTML = '&lt;'; 
                        if (!isGridView) scrollLeftBtn.setAttribute('style', 'display: flex !important');
                        scrollLeftBtn.onclick = () => resultsContainer.scrollBy({ left: -500, behavior: 'smooth' });
                    }
                    if (scrollRightBtn) {
                        scrollRightBtn.innerHTML = '&gt;'; 
                        if (!isGridView) scrollRightBtn.setAttribute('style', 'display: flex !important');
                        scrollRightBtn.onclick = () => resultsContainer.scrollBy({ left: 500, behavior: 'smooth' });
                    }

                    data.results.forEach((movie, index) => {
                        const card = document.createElement('div');
                        card.className = `movie-card ${index === 0 ? 'selected-movie' : ''}`;

                        if (index === 0) {
                            const badge = document.createElement('div');
                            badge.className = 'selected-badge';
                            badge.textContent = 'Selected';
                            card.appendChild(badge);
                        }

                        const img = document.createElement('img');
                        img.className = 'movie-poster';
                        img.src = `https://image.tmdb.org/t/p/w500${movie.poster_path || ''}`;
                        img.alt = movie.title || 'Poster';
                        img.onerror = function () {
                            this.onerror = null;
                            this.src = '/static/icons/fallback.svg';
                        };

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

                        const movieTitle = document.createElement('h3');
                        movieTitle.textContent = movie.title || 'Untitled Movie';
                        card.appendChild(movieTitle);

                        card.onclick = () => {
                            const overlay = document.getElementById('movieOverlay');
                            const content = document.getElementById('movieDetailContent');
                            if (overlay && content) {
                                overlay.classList.remove('hidden');
                                content.innerHTML = '<div class="spinner"></div>';
                                fetch(`/movie_detail?title=${encodeURIComponent(movie.title)}`)
                                    .then(res => res.text())
                                    .then(html => { content.innerHTML = html; })
                                    .catch(() => { content.innerHTML = 'Failed to load details.'; });
                            }
                        };
                        resultsContainer.appendChild(card);
                    });
                } else {
                    alert(data.error || data.message || "No results found.");
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

    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('close-popup')) {
            const overlay = document.getElementById('movieOverlay');
            if (overlay) overlay.classList.add('hidden');
        }
    });
});