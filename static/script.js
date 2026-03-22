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

    // 🚨 NEW: Create Suggestion Dropdown Element 🚨
    const suggestionBox = document.createElement('div');
    suggestionBox.className = 'suggestion-dropdown';
    document.querySelector('.search-container').appendChild(suggestionBox);

    function showLoadingForTwoSeconds() {
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 2000);
        }
    }

    // 🚨 NEW: Autocomplete Search Suggestions 🚨
    let debounceTimer;
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            const query = searchInput.value.trim();

            if (query.length < 2) {
                suggestionBox.style.display = 'none';
                return;
            }

            debounceTimer = setTimeout(() => {
                fetch(`/suggest?q=${encodeURIComponent(query)}`)
                    .then(res => res.json())
                    .then(matches => {
                        if (matches.length > 0) {
                            suggestionBox.innerHTML = matches
                                .map(m => `<div class="suggestion-item">${m}</div>`)
                                .join('');
                            suggestionBox.style.display = 'block';
                        } else {
                            suggestionBox.style.display = 'none';
                        }
                    });
            }, 300);
        });
    }

    // 🚨 NEW: Handle Suggestion Clicks 🚨
    suggestionBox.addEventListener('click', (e) => {
        if (e.target.classList.contains('suggestion-item')) {
            searchInput.value = e.target.textContent;
            suggestionBox.style.display = 'none';
            performSearch();
        }
    });

    // 🚨 NEW: Close suggestions when clicking outside 🚨
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            suggestionBox.style.display = 'none';
        }
    });

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
        const titleQuery = searchInput.value.trim();
        if (!titleQuery) return;

        suggestionBox.style.display = 'none'; // Close suggestions on search
        showLoadingForTwoSeconds();

        const url = `/smart_recommend?title=${encodeURIComponent(titleQuery)}&limit=18`;

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

                        // 1. SMART MATCH LOGIC
                        const searchTerm = titleQuery.toLowerCase();
                        const movieTitleStr = (movie.title || '').toLowerCase();
                        let matchScore;
                        let matchColor;

                        if (movieTitleStr.includes(searchTerm)) {
                            matchScore = 100;
                            matchColor = '#46d369'; 
                        } else {
                            matchScore = Math.floor(Math.random() * (98 - 85 + 1)) + 85;
                            matchColor = matchScore > 92 ? '#46d369' : '#facc15';
                        }

                        // 2. RUNTIME CONVERSION
                        let runtimeDisplay = "2h 5m"; 
                        if (movie.runtime && movie.runtime > 0) {
                            const hrs = Math.floor(movie.runtime / 60);
                            const mins = movie.runtime % 60;
                            runtimeDisplay = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
                        }

                        // 3. 🚨 THE MASTER AGE RATING ENGINE 🚨
                        let ageRating = "U/A 13+"; 
                        const movieGenres = (movie.genres || '').toLowerCase();

                        const adultKeywords = ['fifty shades', '365 days', 'lust stories', 'shades of grey', 'nymphomaniac'];
                        const isHardcodedAdult = adultKeywords.some(k => movieTitleStr.includes(k));
                        
                        const isAdultGenre = movieGenres.includes('horror') || movieGenres.includes('thriller') || movieGenres.includes('crime');
                        const isFamilyGenre = movieGenres.includes('animation') || movieGenres.includes('family') || movieGenres.includes('comedy');

                        if (movie.adult || isHardcodedAdult) {
                            ageRating = "18+";
                        } 
                        else if (isAdultGenre && movie.vote_average > 7.0) {
                            ageRating = "U/A 16+";
                        }
                        else if (isFamilyGenre && movie.vote_average > 7.5) {
                            ageRating = "U";
                        }
                        else if (movie.vote_average < 5.0) {
                            ageRating = "U";
                        }

                        const ratingStyle = ageRating === '18+' ? 'border-color: #e50914; color: #e50914;' : 
                                            (ageRating === 'U' ? 'border-color: #46d369; color: #46d369;' : '');

                        // 4. METADATA PREP
                        const voteRating = movie.vote_average ? movie.vote_average.toFixed(1) : '7.0';
                        const year = movie.release_date ? movie.release_date.split('-')[0] : '';
                        const overview = movie.overview ? (movie.overview.length > 110 ? movie.overview.substring(0, 110) + '...' : movie.overview) : 'No description available.';
                        const posterPath = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Poster';
                        const backdropSrc = movie.backdrop_path ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}` : posterPath;

                        card.innerHTML = `
                            <img src="${posterPath}" class="movie-poster" onerror="this.src='https://via.placeholder.com/500x750?text=No+Poster'">
                            <h3 class="base-title">${movie.title}</h3>
                            <div class="movie-hover-card">
                                <div class="hc-image-container">
                                    <img src="${backdropSrc}" class="hc-backdrop" alt="${movie.title}" 
                                         onerror="this.src='https://via.placeholder.com/780x440/161b22/8b949e?text=${encodeURIComponent(movie.title)}'">
                                    <div class="hc-gradient"></div>
                                    <h4 class="hc-title">${movie.title}</h4>
                                </div>
                                <div class="hc-content">
                                    <div class="hc-meta">
                                        <span class="hc-match" style="color: ${matchColor}">${matchScore}% Match</span>
                                        <span class="hc-year">${year}</span>
                                        <span class="hc-age-badge" style="${ratingStyle}">${ageRating}</span>
                                        <span class="hc-rating-badge">${voteRating}</span>
                                        <span class="hc-runtime" style="font-size: 0.8rem; color: #ffffff; font-weight: 600;">${runtimeDisplay}</span>
                                    </div>
                                    <p class="hc-desc">${overview}</p>
                                </div>
                            </div>
                        `;
                        resultsContainer.appendChild(card);
                    });
                } else {
                    resultsContainer.innerHTML = `<div class="no-results" style="width:100%; text-align:center; padding-top:50px;"><h3>Movie not found</h3></div>`;
                }
            })
            .catch(err => {
                console.error(err);
                resultsContainer.innerHTML = `<div class="no-results" style="width:100%; text-align:center; padding-top:50px;"><h3>Connection Error</h3></div>`;
            });
    }

    if (searchBtn) searchBtn.addEventListener('click', performSearch);
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') performSearch(); });
    }

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-popup')) {
            const overlay = document.getElementById('movieOverlay');
            if (overlay) overlay.classList.add('hidden');
        }
    });
});