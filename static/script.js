document.addEventListener('DOMContentLoaded', () => {
    const filterBtn = document.querySelector('.filterbtn');
    const filterMenu = document.getElementById('filterMenu');
    const resetBtn = document.getElementById('resetFilters');
    const filterForm = document.getElementById('filterForm');

    // --- Filter Menu Logic ---
    if (filterBtn && filterMenu) {
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
    }

    if (filterForm) {
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
    }

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
            return; // Don't even alert, just do nothing if empty
        }

        showLoadingForTwoSeconds();

        // 🚨 CHANGED TO 18 HERE 🚨
        const url = `/smart_recommend?title=${encodeURIComponent(title)}&limit=20`;

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
                    // ✅ SUCCESS: Show Header & Movies
                    if (resultsHeader) resultsHeader.classList.add('show-results');
                    
                    const isGridView = resultsContainer.classList.contains('grid-view');

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

                    data.results.forEach((movie) => {
                        const card = document.createElement('div');
                        card.className = 'movie-card'; 

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
                                    .catch(() => { content.innerHTML = '<div style="color:white;text-align:center;">Failed to load details.</div>'; });
                            }
                        };
                        resultsContainer.appendChild(card);
                    });
                } else {
                    // ✅ NO RESULTS
                    resultsContainer.innerHTML = `
                        <div style="width: 100%; text-align: center; padding: 50px 20px; grid-column: 1 / -1;">
                            <h3 style="font-family: 'Poppins', sans-serif; font-size: 1.5rem; color: #333; margin-bottom: 10px;">Movie not found</h3>
                            <p style="color: #666; font-size: 1rem;">Please check your spelling and try again.</p>
                        </div>
                    `;
                }
            })
            .catch(err => {
                console.error("Fetch error:", err);
                // ✅ SERVER ERROR (Now also says Movie not found)
                resultsContainer.innerHTML = `
                    <div style="width: 100%; text-align: center; padding: 50px 20px; grid-column: 1 / -1;">
                        <h3 style="font-family: 'Poppins', sans-serif; font-size: 1.5rem; color: #333; margin-bottom: 10px;">Movie not found</h3>
                        <p style="color: #666; font-size: 1rem;">Please check your spelling and try again.</p>
                    </div>
                `;
            });
    }

    if (searchBtn) searchBtn.addEventListener('click', performSearch);
    
    if (searchInput) {
        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                performSearch();
            }
        });
    }

    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('close-popup')) {
            const overlay = document.getElementById('movieOverlay');
            if (overlay) overlay.classList.add('hidden');
        }
    });
});