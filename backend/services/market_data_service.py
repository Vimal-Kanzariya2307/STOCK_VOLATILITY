import yfinance as yf
import pandas as pd
import numpy as np
import time

# In-memory cache
CACHE = {}
CACHE_EXPIRY = 60  # seconds


def fetch_stock_data(symbol):

    current_time = time.time()

    # Return cached data if valid
    if symbol in CACHE:
        cached_data, timestamp = CACHE[symbol]
        if current_time - timestamp < CACHE_EXPIRY:
            print("Returning cached data...")
            return cached_data

    # Try NSE first, then BSE, then fallback to raw symbol for US markets
    # If exchange already provided, use as is
    if "." in symbol:
        possible_symbols = [symbol]
    else:
        possible_symbols = [f"{symbol}.NS", f"{symbol}.BO", symbol]


    data = None
    exchange_used = None

    for sym in possible_symbols:
        ticker = yf.Ticker(sym)
        df = ticker.history(period="5y", interval="1d")

        if not df.empty:
            data = df
            exchange_used = sym
            break

    if data is None or data.empty:
        return None

    data = data[['Close']].dropna()

    # Log Returns
    data['Log_Return'] = np.log(data['Close'] / data['Close'].shift(1))

    # Rolling 30-day Volatility (annualized)
    data['Volatility'] = (
        data['Log_Return']
        .rolling(window=30)
        .std() * np.sqrt(252)
    )

    # -------------------------------
    # EWMA Volatility (Advanced Model)
    # -------------------------------
    lambda_ = 0.94
    ewma_var = []
    var = data['Log_Return'].iloc[1] ** 2  # initialize

    for r in data['Log_Return'].dropna():
        var = lambda_ * var + (1 - lambda_) * (r ** 2)
        ewma_var.append(var)

    # Align EWMA length with dataframe
    ewma_series = pd.Series(ewma_var, index=data.index[1:])
    data['Predicted_Volatility'] = np.sqrt(ewma_series) * np.sqrt(252)

    # -------------------------------
    # Moving Averages
    # -------------------------------
    data['MA_5'] = data['Close'].rolling(5).mean()
    data['MA_10'] = data['Close'].rolling(10).mean()
    data['MA_50'] = data['Close'].rolling(50).mean()
    data['MA_100'] = data['Close'].rolling(100).mean()

    data = data.dropna()

    result = {
        "symbol": symbol,
        "exchange_symbol": exchange_used,
        "dates": data.index.strftime('%Y-%m-%d').tolist(),
        "prices": data['Close'].round(2).tolist(),
        "volatility": data['Volatility'].round(4).tolist(),
        "predicted_volatility": data['Predicted_Volatility'].round(4).tolist(),
        "ma5": data['MA_5'].round(2).tolist(),
        "ma10": data['MA_10'].round(2).tolist(),
        "ma50": data['MA_50'].round(2).tolist(),
        "ma100": data['MA_100'].round(2).tolist(),
        "latest_price": round(data['Close'].iloc[-1], 2),
        "latest_volatility": round(data['Volatility'].iloc[-1], 4),
        "latest_predicted_volatility": round(data['Predicted_Volatility'].iloc[-1], 4)
    }

    CACHE[symbol] = (result, current_time)

    return result


