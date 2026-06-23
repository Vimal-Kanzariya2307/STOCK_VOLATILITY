# Stock Volatility & Trend Analysis App

A full-stack web application designed to analyze stock market risk, volatility, and trend patterns. The system integrates real-time stock market data with statistical and time-series modeling to provide interactive forecasts and PDF reporting.

---

## 📁 Project Structure

```text
STOCK_VOLATILITY/
├── backend/
│   ├── app.py                      # Flask API endpoints (stock details, ticker search)
│   ├── config.py                   # Configuration settings
│   ├── requirements.txt            # Python dependencies
│   ├── models/                     # Data/predictive models
│   │   └── volatility.py
│   ├── services/                   # Business logic and external API integrations
│   │   ├── __init__.py
│   │   └── market_data_service.py  # Fetches stock details and computes metrics (moving averages, EWMA)
│   └── utils/                      # Helper utilities
│       └── helpers.py
│
├── frontend/
│   ├── index.html                  # Main entry point (auth status check and router)
│   ├── pages/                      # Page templates
│   │   ├── login.html              # Login page (animated pull-cord lamp UI)
│   │   ├── signup.html             # User registration
│   │   └── dashboard.html          # Interactive stock dashboard
│   ├── css/                        # Core stylesheets
│   │   └── style.css               # Dashboard and theme styling
│   └── js/                         # Frontend application scripts
│       ├── app.js                  # Main controller, API integration, and PDF generation
│       ├── auth.js                 # Authentication logic (local storage based session)
│       └── charts.js               # Chart.js visualizations
│
├── .gitignore                      # Git configuration to ignore Python/OS cache files
└── README.md                       # Main repository overview & setup guide (this file)
```

---

## ✨ Features

* **Real-Time Data Integration**: Fetches live stock details using Yahoo Finance API (`yfinance`).
* **Volatility Computations**:
  * Rolling 30-day annualized volatility.
  * EWMA (Exponentially Weighted Moving Average) Volatility (advanced risk model).
* **Trend Analysis**: Computes MA 5, MA 10, MA 50, and MA 100 moving averages.
* **Dynamic Charting**: Renders interactive price and volatility line charts using Chart.js.
* **PDF Report Generation**: Exports complete stock analysis reports including charts to PDF.
* **Session Auth Flow**: Local storage-based user signup/login and session management.
* **Interactive UI**: Sleek dark mode login page with draggable GSAP lamp animation.

---

## 🚀 Getting Started

### 1. Prerequisites
* Python 3.8+
* Web browser

### 2. Backend Setup
1. Open your terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the Flask development server:
   ```bash
   python app.py
   ```
   The backend API will run on `http://127.0.0.1:5000/`.

### 3. Frontend Setup
The frontend is built entirely using vanilla HTML, CSS, and Javascript:
1. Open `frontend/index.html` in your web browser.
2. Sign up with a new account (credentials are stored locally), then pull the lamp cord to reveal the login screen.
3. Access the stock analysis dashboard, search/enter a ticker (e.g., `AAPL`, `INFY`, `TSLA`), and click **Analyze**!
