document.addEventListener('DOMContentLoaded', () => {
    
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

    // --- Perform Search ---
    function performSearch() {
        const title = searchInput.value.trim();
        if (!title) {
            return; // Don't search if the box is empty
        }

        showLoadingForTwoSeconds();

        // 🚨 Fetch URL reverted to purely grab 18 movies based on the title
        const url = `/smart_recommend?title=${encodeURIComponent(title)}&limit=18`;

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
                            <h3 style="font-family: 'Poppins', sans-serif; font-size: 1.5rem; color: #ffffff; margin-bottom: 10px;">Movie not found</h3>
                            <p style="color: #9ca3af; font-size: 1rem;">Please check your spelling and try again.</p>
                        </div>
                    `;
                }
            })
            .catch(err => {
                console.error("Fetch error:", err);
                // ✅ SERVER ERROR
                resultsContainer.innerHTML = `
                    <div style="width: 100%; text-align: center; padding: 50px 20px; grid-column: 1 / -1;">
                        <h3 style="font-family: 'Poppins', sans-serif; font-size: 1.5rem; color: #ffffff; margin-bottom: 10px;">Movie not found</h3>
                        <p style="color: #9ca3af; font-size: 1rem;">Please check your spelling and try again.</p>
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