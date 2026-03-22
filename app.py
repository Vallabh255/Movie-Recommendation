from flask import Flask, request, jsonify, render_template
from data_loader import get_data, get_basic_data
import pandas as pd
import requests
import os

app = Flask(__name__)

# 🔐 Load TMDB API Key from environment variable
TMDB_API_KEY = os.environ.get("TMDB_API_KEY")

USE_RECOMMENDATION = True

# Initialize data and FAISS index
if USE_RECOMMENDATION:
    df, embeddings, title_to_index, index = get_data()
else:
    df = get_basic_data()

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/smart_recommend', methods=['GET'])
def smart_recommend():
    try:
        # Get and normalize query parameters
        title = request.args.get('title', '').strip().lower()
        genre = request.args.get('genre', '').strip().lower()
        num_results = int(request.args.get('limit', 18))

        if not title:
            return jsonify({"error": "Missing 'title' parameter."}), 400

        if title not in title_to_index:
            return jsonify({"error": f"Movie '{title}' not found in index."}), 404

        # Helper to safely get values from DataFrame (handles NaN/None)
        def get_val(row, field, default=''):
            val = row.get(field)
            if pd.isna(val) or val is None:
                return default
            return val

        # Helper to package movie data for JSON response
        def format_movie_data(row, similarity_score="0%"):
            # Safely handle runtime conversion
            try:
                raw_runtime = row.get('runtime')
                runtime = int(raw_runtime) if pd.notna(raw_runtime) else 0
            except:
                runtime = 0

            return {
                'title': get_val(row, 'title'),
                'overview': get_val(row, 'overview'),
                'vote_average': float(get_val(row, 'vote_average', 0.0)),
                'release_date': str(get_val(row, 'release_date')),
                'popularity': float(get_val(row, 'popularity', 0.0)),
                'genres': get_val(row, 'genres'),
                'poster_path': get_val(row, 'poster_path'),
                'backdrop_path': get_val(row, 'backdrop_path') or get_val(row, 'poster_path'),
                'similarity': similarity_score,
                'adult': str(get_val(row, 'adult')).lower() in ['true', '1', 'yes'],
                'certification': get_val(row, 'certification', get_val(row, 'content_rating', '')),
                'runtime': runtime  # 🚨 Added for the duration display
            }

        # 1. FIND MAIN MOVIE (EXACT HIT)
        idx = title_to_index[title]
        main_movie = df.iloc[idx]
        exact_result = format_movie_data(main_movie, "100%")

        # 2. VECTOR SEARCH FOR RELATED MOVIES
        query_vector = embeddings[idx].reshape(1, -1)
        D, I = index.search(query_vector, num_results + 10)

        related_results = []
        seen = {idx} # Prevent duplicating the main movie
        
        for score, i in zip(D[0], I[0]):
            if i >= len(df) or i in seen or i < 0:
                continue

            movie_row = df.iloc[i]
            
            # Genre filter logic
            if genre and genre not in str(get_val(movie_row, 'genres')).lower():
                continue

            # Calculate similarity percentage
            sim_str = f"{round(float(score) * 100, 2)}%"
            related_results.append(format_movie_data(movie_row, sim_str))

            seen.add(i)
            if len(related_results) >= num_results:
                break

        return jsonify({
            "results": [exact_result] + related_results, 
            "count": len(related_results) + 1
        })

    except Exception as e:
        print("[EXCEPTION]", e)
        return jsonify({"error": "Internal server error.", "details": str(e)}), 500

@app.route('/suggest', methods=['GET'])
def suggest():
    query = request.args.get('q', '').strip().lower()
    if not query:
        return jsonify([])

    matches = [t for t in title_to_index.keys() if query in t]
    return jsonify(matches[:10])

@app.route('/movie_detail')
def movie_detail():
    title = request.args.get('title', '').strip().lower()
    if not title or title not in title_to_index:
        return "Movie not found", 404

    idx = title_to_index[title]
    movie_row = df.iloc[idx]

    movie = {
        'title': movie_row.get('title') or '',
        'overview': movie_row.get('overview') or '',
        'vote_average': movie_row.get('vote_average') or '',
        'popularity': movie_row.get('popularity') or '',
        'genres': movie_row.get('genres') or '',
        'adult': bool(movie_row.get('adult', False)),
        'poster_path': movie_row.get('poster_path') or ''
    }

    # Fetch credits from TMDB if available
    movie_id = movie_row.get('id')
    if TMDB_API_KEY and pd.notna(movie_id):
        try:
            credits_url = f'https://api.themoviedb.org/3/movie/{int(movie_id)}/credits'
            response = requests.get(credits_url, params={'api_key': TMDB_API_KEY})
            if response.status_code == 200:
                data = response.json()
                director = next((c['name'] for c in data.get('crew', []) if c.get('job') == 'Director'), 'N/A')
                cast = [c['name'] for c in data.get('cast', [])[:3]]
                movie['director'] = director
                movie['cast'] = cast
        except Exception as e:
            print("[TMDB API ERROR]", e)

    return render_template('movie_detail.html', movie=movie)

if __name__ == '__main__':
    app.run(debug=True, port=5000)