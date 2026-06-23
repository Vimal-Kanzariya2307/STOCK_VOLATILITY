from flask import Flask, jsonify, request
from flask_cors import CORS
import requests

from services.auth_service import authenticate_user, register_user, verify_token
from services.market_data_service import fetch_stock_data

app = Flask(__name__)
CORS(app)


@app.route("/")
def home():
    return "Stock Analysis API is running 🚀"


@app.route("/api/auth/signup", methods=["POST"])
def auth_signup():
    data = request.get_json(silent=True) or {}
    user, error = register_user(
        data.get("name"),
        data.get("email"),
        data.get("password"),
    )

    if error:
        status = 409 if "already" in error.lower() else 400
        return jsonify({"error": error}), status

    return jsonify({"message": "Signup successful", "user": user}), 201


@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    data = request.get_json(silent=True) or {}
    token, user, error = authenticate_user(data.get("email"), data.get("password"))

    if error:
        return jsonify({"error": error}), 401

    return jsonify({"token": token, "user": user})


@app.route("/api/auth/me", methods=["GET"])
def auth_me():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Missing or invalid token"}), 401

    token = auth_header[7:]
    user, error = verify_token(token)

    if error:
        return jsonify({"error": error}), 401

    return jsonify({"user": user})


@app.route("/api/stock-details", methods=["GET"])
def stock_details():
    symbol = request.args.get("symbol")

    if not symbol:
        return jsonify({"error": "Symbol is required"}), 400

    result = fetch_stock_data(symbol.upper())

    if result is None:
        return jsonify({"error": "Stock not found"}), 404

    return jsonify(result)


@app.route("/api/search-stocks")
def search_stocks():
    query = request.args.get("q")

    if not query:
        return jsonify([])

    try:
        url = "https://query2.finance.yahoo.com/v1/finance/search"

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

        params = {
            "q": query,
            "quotesCount": 25,
            "newsCount": 0
        }

        response = requests.get(url, headers=headers, params=params)
        data = response.json()
        quotes = data.get("quotes", [])
        
        seen_symbols = set()
        indian_suggestions = []
        other_suggestions = []

        for item in quotes:
            symbol = item.get("symbol")
            if not symbol:
                continue

            quote_type = item.get("quoteType", "")
            if quote_type not in ["EQUITY", "INDEX"]:
                continue

            name = item.get("shortname") or item.get("longname") or symbol
            exchange = item.get("exchange", "")

            # Check if this is an Indian stock/index
            is_indian = (
                symbol.endswith(".NS") or 
                symbol.endswith(".BO") or 
                exchange in ["NSI", "BSE"]
            )

            if is_indian:
                base_symbol = symbol.split(".")[0]
                
                # Add NSE option
                nse_symbol = f"{base_symbol}.NS"
                if nse_symbol not in seen_symbols:
                    seen_symbols.add(nse_symbol)
                    indian_suggestions.append({
                        "symbol": nse_symbol,
                        "name": name,
                        "exchange": "NSE"
                    })

                # Add BSE option
                bse_symbol = f"{base_symbol}.BO"
                if bse_symbol not in seen_symbols:
                    seen_symbols.add(bse_symbol)
                    indian_suggestions.append({
                        "symbol": bse_symbol,
                        "name": name,
                        "exchange": "BSE"
                    })
            else:
                if symbol not in seen_symbols:
                    seen_symbols.add(symbol)
                    other_suggestions.append({
                        "symbol": symbol,
                        "name": name,
                        "exchange": exchange
                    })

        return jsonify(indian_suggestions + other_suggestions)

    except Exception as e:
        return jsonify({"error": str(e)})


if __name__ == "__main__":
    app.run(debug=True)
