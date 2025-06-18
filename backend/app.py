
from flask import Flask, jsonify
from flask_cors import CORS # Needed for cross-origin requests from frontend to backend
import requests
import os

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

# You might get your API key from environment variables for security
NEWS_API_KEY = os.getenv("NEWS_API_KEY", "YOUR_NEWS_API_KEY_HERE")
# Replace "YOUR_NEWS_API_KEY_HERE" with a real key from a news API provider (e.g., NewsAPI.org)

@app.route('/')
def home():
    return "Welcome to the News Website Backend!"

@app.route('/api/top-news')
def get_top_news():
    try:
        # Example: Fetch top headlines from NewsAPI.org
        # You'll need to sign up for a free API key at newsapi.org
        url = f"https://newsapi.org/v2/top-headlines?country=us&apiKey={NEWS_API_KEY}"
        response = requests.get(url)
        response.raise_for_status() # Raises an HTTPError for bad responses (4xx or 5xx)
        data = response.json()
        articles = data.get('articles', [])
        return jsonify(articles)
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Failed to fetch news: {e}"}), 500
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {e}"}), 500

if __name__ == '__main__':
    # For development: Flask will pick up changes automatically with debug=True
    # For production: Use a production-ready WSGI server like Gunicorn or uWSGI
    app.run(debug=True, port=5000)