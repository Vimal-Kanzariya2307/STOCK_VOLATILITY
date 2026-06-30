import yfinance as yf
import pandas as pd
import numpy as np
import time

# In-memory caches
CACHE = {}      # cached calculated results keyed by (symbol, lambda_)
DF_CACHE = {}   # cached raw yfinance dataframes keyed by symbol
CACHE_EXPIRY = 60  # seconds
DF_CACHE_EXPIRY = 300  # seconds (5 minutes)


def fetch_stock_data(symbol, lambda_=0.94):

    current_time = time.time()

    # Check calculated results cache first
    cache_key = (symbol, lambda_)
    if cache_key in CACHE:
        cached_result, timestamp = CACHE[cache_key]
        if current_time - timestamp < CACHE_EXPIRY:
            print(f"Returning cached calculated results for {symbol} with lambda={lambda_}...")
            return cached_result

    # Get yfinance dataframe from cache or fetch new
    df = None
    exchange_used = None

    if symbol in DF_CACHE:
        cached_df, cached_exchange, df_timestamp = DF_CACHE[symbol]
        if current_time - df_timestamp < DF_CACHE_EXPIRY:
            print(f"Returning cached yfinance DataFrame for {symbol}...")
            df = cached_df
            exchange_used = cached_exchange

    if df is None:
        # Try NSE first, then BSE, then fallback to raw symbol for US markets
        # If exchange already provided, use as is
        if "." in symbol:
            possible_symbols = [symbol]
        else:
            possible_symbols = [f"{symbol}.NS", f"{symbol}.BO", symbol]

        for sym in possible_symbols:
            ticker = yf.Ticker(sym)
            fetched_df = ticker.history(period="5y", interval="1d")

            if not fetched_df.empty:
                df = fetched_df
                exchange_used = sym
                break

        if df is None or df.empty:
            return None

        # Store raw DataFrame in cache
        DF_CACHE[symbol] = (df, exchange_used, current_time)

    # Work on a copy of the Close prices
    data = df[['Close']].copy().dropna()

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
    ewma_var = []
    log_returns = data['Log_Return'].dropna()
    if len(log_returns) > 0:
        var = log_returns.iloc[0] ** 2  # initialize variance
    else:
        var = 0.0

    for r in log_returns:
        var = lambda_ * var + (1 - lambda_) * (r ** 2)
        ewma_var.append(var)

    # Align EWMA length with dataframe (starts from row 1 since r_0 log return is NaN)
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
    if data.empty:
        return None

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
        "latest_predicted_volatility": round(data['Predicted_Volatility'].iloc[-1], 4),
        "lambda": lambda_
    }

    CACHE[cache_key] = (result, current_time)

    return result


