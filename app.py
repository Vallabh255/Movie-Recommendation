from flask import Flask, request, jsonify, render_template
from sklearn.metrics.pairwise import linear_kernel
from data_loader import get_data, get_basic_data
import pandas as pd
import requests
import os

app = Flask(__name__)

# 🔐 Load TMDB API Key from environment variable
TMDB_API_KEY = os.environ.get("TMDB_API_KEY")

USE_RECOMMENDATION = True

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
        title = request.args.get('title', '').strip().lower()
        genre = request.args.get('genre', '').strip().lower()
        num_results = int(request.args.get('limit', 10))

        print(f"[INFO] Searching for title: {title} | genre: {genre}")

        if not title:
            return jsonify({"error": "Missing 'title' parameter."}), 400

        if title not in title_to_index:
            print("[ERROR] Title not found in index.")
            return jsonify({"error": f"Movie '{title}' not found in index."}), 404

        idx = title_to_index[title]
        query_vector = embeddings[idx].reshape(1, -1)

        D, I = index.search(query_vector, num_results + 10)

        related_results = []
        seen = set()
        for score, i in zip(D[0], I[0]):
            if i == idx or i >= len(df) or i in seen:
                continue

            movie = df.iloc[i]
            if genre and genre not in str(movie.get('genres', '')).lower():
                continue

            related_results.append({
                'title': movie.get('title') or '',
                'overview': movie.get('overview') or '',
                'vote_average': movie.get('vote_average') if pd.notna(movie.get('vote_average')) else 0.0,
                'popularity': movie.get('popularity') if pd.notna(movie.get('popularity')) else 0.0,
                'genres': movie.get('genres') or '',
                'poster_path': movie.get('poster_path') if pd.notna(movie.get('poster_path')) else '',
                'similarity': f"{round(float(score) * 100, 2)}%",
                'adult': str(movie.get('adult')).lower() in ['true', '1', 'yes']
            })

            seen.add(i)
            if len(related_results) >= num_results:
                break

        main_movie = df.iloc[idx]
        exact_result = {
            'title': main_movie.get('title') or '',
            'overview': main_movie.get('overview') or '',
            'vote_average': main_movie.get('vote_average') if pd.notna(main_movie.get('vote_average')) else 0.0,
            'popularity': main_movie.get('popularity') if pd.notna(main_movie.get('popularity')) else 0.0,
            'genres': main_movie.get('genres') or '',
            'poster_path': main_movie.get('poster_path') if pd.notna(main_movie.get('poster_path')) else '',
            'similarity': "100%",
            'adult': bool(main_movie.get('adult', False))
        }

        return jsonify({"results": [exact_result] + related_results, "count": len(related_results) + 1})

    except Exception as e:
        print("[EXCEPTION]", e)
        return jsonify({"error": "Internal server error.", "details": str(e)}), 500

@app.route('/suggest', methods=['GET'])
def suggest():
    query = request.args.get('q', '').strip().lower()
    if not query:
        return jsonify([])

    matches = [title for title in title_to_index.keys() if query in title]
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

    # 🎬 Fetch cast & director from TMDB
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
            movie['director'] = 'N/A'
            movie['cast'] = []

    return render_template('movie_detail.html', movie=movie)

if __name__ == '__main__':
    app.run(debug=True)
