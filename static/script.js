document.addEventListener('DOMContentLoaded', () => {
    
    // --- UI References ---
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

    // --- View All / Grid Toggle ---
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', () => {
            resultsContainer.classList.toggle('horizontal-scroll');
            resultsContainer.classList.toggle('grid-view');
            
            const isGridView = resultsContainer.classList.contains('grid-view');
            viewAllBtn.textContent = isGridView ? 'Show Less' : 'View All';
            
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

    // --- Search Logic ---
    function performSearch() {
        const title = searchInput.value.trim();
        if (!title) return;

        showLoadingForTwoSeconds();

        const url = `/smart_recommend?title=${encodeURIComponent(title)}&limit=18`;

        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error("Search failed.");
                return res.json();
            })
            .then(data => {
                resultsContainer.innerHTML = '';
                
                if (resultsHeader) resultsHeader.classList.remove('show-results');
                if (scrollLeftBtn) scrollLeftBtn.setAttribute('style', 'display: none !important');
                if (scrollRightBtn) scrollRightBtn.setAttribute('style', 'display: none !important');

                if (data.results && data.results.length > 0) {
                    if (resultsHeader) resultsHeader.classList.add('show-results');
                    
                    const isGridView = resultsContainer.classList.contains('grid-view');

                    if (scrollLeftBtn) {
                        scrollLeftBtn.innerHTML = '‹'; 
                        if (!isGridView) scrollLeftBtn.setAttribute('style', 'display: flex !important');
                        scrollLeftBtn.onclick = () => resultsContainer.scrollBy({ left: -500, behavior: 'smooth' });
                    }
                    if (scrollRightBtn) {
                        scrollRightBtn.innerHTML = '›'; 
                        if (!isGridView) scrollRightBtn.setAttribute('style', 'display: flex !important');
                        scrollRightBtn.onclick = () => resultsContainer.scrollBy({ left: 500, behavior: 'smooth' });
                    }

                    data.results.forEach((movie) => {
                        const card = document.createElement('div');
                        card.className = 'movie-card'; 

                        const posterPath = movie.poster_path 
                            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` 
                            : '/static/icons/fallback.svg';

                        const img = document.createElement('img');
                        img.className = 'movie-poster';
                        img.src = posterPath;
                        img.alt = movie.title;
                        img.onerror = function() { this.src = 'https://via.placeholder.com/500x750/0d1117/facc15?text=No+Poster'; };
                        
                        card.appendChild(img);

                        const movieTitle = document.createElement('h3');
                        movieTitle.className = 'base-title';
                        movieTitle.textContent = movie.title;
                        card.appendChild(movieTitle);

                        const hoverCard = document.createElement('div');
                        hoverCard.className = 'movie-hover-card';
                        
                        const year = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';
                        const rating = movie.adult ? '18+' : 'U/A 13+';
                        const overview = movie.overview ? (movie.overview.length > 120 ? movie.overview.substring(0, 120) + '...' : movie.overview) : 'No description available.';
                        
                        const backdropSrc = movie.backdrop_path 
                            ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}` 
                            : posterPath;

                        hoverCard.innerHTML = `
                            <div class="hc-image-container">
                                <img src="${backdropSrc}" class="hc-backdrop" alt="${movie.title}" 
                                     onerror="this.src='https://via.placeholder.com/780x440/161b22/8b949e?text=${encodeURIComponent(movie.title)}'">
                                <div class="hc-gradient"></div>
                                <h4 class="hc-title">${movie.title}</h4>
                            </div>
                            <div class="hc-content">
                                <div class="hc-meta">
                                    <span>${year}</span> <span class="dot">•</span> <span>${rating}</span> <span class="dot">•</span> <span>Movie</span>
                                </div>
                                <p class="hc-desc">${overview}</p>
                            </div>
                        `;

                        // 🚨 CLICK LOGIC REMOVED 🚨
                        card.appendChild(hoverCard);
                        resultsContainer.appendChild(card);
                    });
                } else {
                    resultsContainer.innerHTML = `<div class="no-results"><h3>Movie not found</h3></div>`;
                }
            })
            .catch(err => {
                resultsContainer.innerHTML = `<div class="no-results"><h3>Connection Error</h3></div>`;
            });
    }

    if (searchBtn) searchBtn.addEventListener('click', performSearch);
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') performSearch(); });
    }

    // Close logic kept in case you have other popups, but cards won't trigger it anymore.
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-popup')) {
            document.getElementById('movieOverlay').classList.add('hidden');
        }
    });
});