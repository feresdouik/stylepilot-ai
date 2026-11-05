import os
from flask import Flask, jsonify, request, send_from_directory
from dotenv import load_dotenv
import requests

load_dotenv()

app = Flask(__name__, static_folder=".", static_url_path="")

@app.get("/")
def home():
    return send_from_directory(".", "index.html")

@app.get("/api/health")
def health():
    return jsonify({"ok": True, "service": "StylePilot AI Research API"})

@app.post("/api/research")
def research():
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        return jsonify({"error": "Tavily API key is not configured on the server."}), 503

    data = request.get_json(silent=True) or {}
    query = str(data.get("query", "")).strip()
    if not query:
        return jsonify({"error": "Please enter a research question."}), 400
    if len(query) > 400:
        return jsonify({"error": "Research question must be 400 characters or fewer."}), 400

    try:
        response = requests.post(
            "https://api.tavily.com/search",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "query": f"{query} Tunisia Tunisian local clothing shops boutiques online stores product listings prices TND DT sizes collections Facebook Instagram retailers",
                "search_depth": "advanced",
                "max_results": 12,
                "topic": "general",
                "include_answer": False,
            },
            timeout=30,
        )
        response.raise_for_status()
        payload = response.json()

        results = []
        for item in payload.get("results", []):
            results.append({
                "title": item.get("title", "Untitled source"),
                "url": item.get("url", ""),
                "content": item.get("content", ""),
                "score": item.get("score"),
                "published_date": item.get("published_date"),
            })

        return jsonify({
                "query": query,
            "answer": payload.get("answer", ""),
            "results": results,
            "response_time": payload.get("response_time"),
        })
    except requests.RequestException as exc:
        status = getattr(getattr(exc, "response", None), "status_code", None)
        if status == 401:
            return jsonify({"error": "Tavily rejected the API key. Check the server environment variable."}), 502
        return jsonify({"error": "The research request failed. Please try again shortly."}), 502
    except ValueError:
        return jsonify({"error": "Tavily returned an unreadable response."}), 502

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.getenv("PORT", "5000")), debug=False)
