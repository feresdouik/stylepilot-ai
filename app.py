import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urldefrag
from flask import Flask, jsonify, request, send_from_directory
from dotenv import load_dotenv
import requests

load_dotenv()

# Serve only the public frontend assets. Never expose the project directory:
# it contains the private .env file.
app = Flask(__name__, static_folder=None)

@app.get("/")
def home():
    return send_from_directory(".", "index.html")

@app.get("/style.css")
def stylesheet():
    return send_from_directory(".", "style.css")

@app.get("/script.js")
def frontend_script():
    return send_from_directory(".", "script.js")

@app.get("/api/health")
def health():
    return jsonify({"ok": True, "service": "StylePilot AI Research API"})

def search_tavily(api_key, search_query, lane):
    response = requests.post(
        "https://api.tavily.com/search",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "query": search_query,
            "search_depth": "advanced",
            "max_results": 8,
            "topic": "general",
            "include_answer": False,
        },
        timeout=35,
    )
    response.raise_for_status()
    payload = response.json()
    found = []
    for item in payload.get("results", []):
        url = item.get("url", "")
        if not url:
            continue
        found.append({
            "title": item.get("title", "Untitled source"),
            "url": url,
            "content": item.get("content", ""),
            "score": item.get("score"),
            "published_date": item.get("published_date"),
            "search_lane": lane,
        })
    return found

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

    # Split research into distinct discovery lanes. A normal social post is
    # evidence of a seller only when its content supports that conclusion;
    # it is never automatically labelled as a paid advertisement.
    searches = [
        (
            "Tunisian online sellers",
            f"{query} Tunisia Tunisie Tunisian online shop boutique vêtements ensembles enfants prix livraison commande WhatsApp Messenger paiement à la livraison",
        ),
        (
            "Facebook seller posts",
            f"site:facebook.com {query} Tunisia Tunisie vente prix tailles disponibles livraison Messenger WhatsApp commander",
        ),
        (
            "Instagram seller posts",
            f"site:instagram.com {query} Tunisia Tunisie boutique vente prix livraison DM WhatsApp vêtements enfants",
        ),
        (
            "Meta Ads Library",
            f'site:facebook.com/ads/library "{query}" "kids clothing" OR "baby clothes" OR "children clothing" Tunisia Tunisie active',
        ),
        (
            "French and Arabic local results",
            f"{query} تونس ملابس أطفال طقم أطفال بيع أونلاين توصيل تونس prix livraison vêtements enfants ensemble",
        ),
    ]

    results = []
    failed_lanes = []
    auth_failed = False
    try:
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = {
                executor.submit(search_tavily, api_key, search_query, lane): lane
                for lane, search_query in searches
            }
            for future in as_completed(futures):
                lane = futures[future]
                try:
                    results.extend(future.result())
                except requests.HTTPError as exc:
                    if getattr(exc.response, "status_code", None) == 401:
                        auth_failed = True
                    failed_lanes.append(lane)
                except (requests.RequestException, ValueError):
                    failed_lanes.append(lane)

        if auth_failed:
            return jsonify({"error": "Tavily rejected the API key. Check the server environment variable."}), 502
        if not results:
            return jsonify({
                "error": "All targeted research searches failed. Check the connection and Tavily API key, then try again."
            }), 502

        # Deduplicate by exact URL (apart from fragments), preserving ad IDs
        # and keeping the strongest-scoring occurrence.
        unique = {}
        for item in results:
            key = urldefrag(item["url"])[0].rstrip("/")
            if key not in unique or (item.get("score") or 0) > (unique[key].get("score") or 0):
                unique[key] = item

        ordered = sorted(
            unique.values(),
            key=lambda item: item.get("score") or 0,
            reverse=True,
        )
        return jsonify({
            "query": query,
            "answer": "",
            "results": ordered[:30],
            "search_lanes": len(searches),
            "successful_lanes": len(searches) - len(failed_lanes),
            "failed_lanes": failed_lanes,
        })
    except Exception:
        app.logger.exception("Unexpected research failure")
        return jsonify({"error": "The research request failed unexpectedly. Please try again."}), 500

if __name__ == "__main__":
    app.run(
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "5000")),
        debug=False,
    )
