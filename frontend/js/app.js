let globalStockData = null;

/**
 * Perform Stock Volatility & Trend Analysis
 */
async function analyzeStock() {
    const symbol = document.getElementById("tickerInput").value.trim().toUpperCase();
    
    if (!symbol) {
        alert("Please enter a stock ticker symbol");
        return;
    }

    const skeletonLoader = document.getElementById("skeletonLoader");
    const metricsGrid = document.getElementById("metricsGrid");
    const chartsGrid = document.getElementById("chartsGrid");
    const resultsSection = document.getElementById("resultsSection");
    const emptyStateCard = document.getElementById("emptyStateCard");
    const analyzeBtn = document.getElementById("analyzeBtn");

    // Show loading skeleton states and hide other cards
    emptyStateCard.style.display = "none";
    metricsGrid.style.display = "none";
    chartsGrid.style.display = "none";
    resultsSection.style.display = "none";
    skeletonLoader.style.display = "block";
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = "⏳ Analyzing...";

    try {
        const response = await fetch(`http://127.0.0.1:5000/api/stock-details?symbol=${symbol}`);
        
        if (!response.ok) {
            throw new Error(response.status === 404 ? "Ticker not found. Please try another symbol." : "Server error occurred.");
        }

        const data = await response.json();
        globalStockData = data;

        if (data.error) {
            alert(data.error);
            resetDashboardView();
            return;
        }

        // Calculate and Render Metrics
        updateMetricCards(data);

        // Render detailed overview summary table
        renderDetailedSummaryTable(data);

        // Render Visualizations
        renderCharts(data);

        // Transition from Skeleton to actual cards
        skeletonLoader.style.display = "none";
        metricsGrid.style.display = "grid";
        chartsGrid.style.display = "grid";
        resultsSection.style.display = "block";

        // Scroll smoothly to metrics panel
        metricsGrid.scrollIntoView({ behavior: "smooth", block: "start" });

    } catch (error) {
        console.error("Analysis failed:", error);
        alert(error.message || "Failed to retrieve stock data from the server.");
        resetDashboardView();
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Analyze Ticker
        `;
    }
}

/**
 * Update the Top Metric Cards
 */
function updateMetricCards(data) {
    // 1. Price Card
    const latestPrice = data.latest_price;
    const prevPrice = data.prices[data.prices.length - 2] || latestPrice;
    const priceDiff = latestPrice - prevPrice;
    const priceDiffPct = (priceDiff / prevPrice) * 100;
    
    document.getElementById("valPrice").innerHTML = `₹${latestPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    document.getElementById("valExchange").innerText = data.exchange_symbol;

    const priceCard = document.getElementById("metricCardPrice");
    removePrevFooters(priceCard);
    
    const footerDiv = document.createElement("div");
    footerDiv.className = "metric-footer";
    if (priceDiff >= 0) {
        footerDiv.innerHTML = `<span class="metric-change-up">▲ ₹${priceDiff.toFixed(2)} (+${priceDiffPct.toFixed(2)}%)</span> vs yesterday`;
    } else {
        footerDiv.innerHTML = `<span class="metric-change-down">▼ ₹${Math.abs(priceDiff).toFixed(2)} (${priceDiffPct.toFixed(2)}%)</span> vs yesterday`;
    }
    priceCard.appendChild(footerDiv);

    // 2. Volatility Card
    document.getElementById("valVolatility").innerText = `${(data.latest_volatility * 100).toFixed(2)}%`;

    // 3. Predicted Volatility Card
    document.getElementById("valPredictedVolatility").innerText = `${(data.latest_predicted_volatility * 100).toFixed(2)}%`;

    // 4. Crossover Trend calculation (MA50 vs MA100)
    const ma50 = data.ma50[data.ma50.length - 1];
    const ma100 = data.ma100[data.ma100.length - 1];
    const trendEl = document.getElementById("valTrend");
    
    if (latestPrice > ma50 && ma50 > ma100) {
        trendEl.innerHTML = `<span class="bullish-badge">BULLISH CROSSOVER</span>`;
    } else if (latestPrice < ma50 && ma50 < ma100) {
        trendEl.innerHTML = `<span class="bearish-badge">BEARISH CROSSOVER</span>`;
    } else {
        trendEl.innerHTML = `<span class="neutral-badge">NEUTRAL TREND</span>`;
    }
}

function removePrevFooters(cardElement) {
    const footers = cardElement.getElementsByClassName("metric-footer");
    while (footers[0]) {
        footers[0].parentNode.removeChild(footers[0]);
    }
}

/**
 * Render detailed key value overview table
 */
function renderDetailedSummaryTable(data) {
    const ma5Val = data.ma5[data.ma5.length - 1];
    const ma10Val = data.ma10[data.ma10.length - 1];
    const ma50Val = data.ma50[data.ma50.length - 1];
    const ma100Val = data.ma100[data.ma100.length - 1];

    const resultsDiv = document.getElementById("analysisResults");
    
    resultsDiv.innerHTML = `
        <div class="result-card">
            <div class="result-metric">
                <label>Ticker Symbol</label>
                <p>${data.symbol}</p>
            </div>
            <div class="result-metric">
                <label>Latest Close Price</label>
                <p>₹${data.latest_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
            <div class="result-metric">
                <label>30-Day Volatility (Ann.)</label>
                <p>${(data.latest_volatility * 100).toFixed(2)}%</p>
            </div>
            <div class="result-metric">
                <label>EWMA Forecast Volatility</label>
                <p>${(data.latest_predicted_volatility * 100).toFixed(2)}%</p>
            </div>
            <div class="result-metric">
                <label>Short-term trend (MA 5 / MA 10)</label>
                <p>₹${ma5Val.toFixed(2)} / ₹${ma10Val.toFixed(2)}</p>
            </div>
            <div class="result-metric">
                <label>Long-term trend (MA 50 / MA 100)</label>
                <p>₹${ma50Val.toFixed(2)} / ₹${ma100Val.toFixed(2)}</p>
            </div>
        </div>
    `;
}

/**
 * Reset layout elements if search fails
 */
function resetDashboardView() {
    document.getElementById("skeletonLoader").style.display = "none";
    document.getElementById("emptyStateCard").style.display = "block";
    document.getElementById("metricsGrid").style.display = "none";
    document.getElementById("chartsGrid").style.display = "none";
    document.getElementById("resultsSection").style.display = "none";
    globalStockData = null;
}

// Re-render when limit lookback changes
document.getElementById("limit").addEventListener("change", function () {
    if (globalStockData) {
        renderCharts(globalStockData);
        updateMetricCards(globalStockData);
        renderDetailedSummaryTable(globalStockData);
    }
});

/**
 * Premium PDF Report Generation
 */
function downloadPDF() {
    if (!globalStockData) {
        alert("Please analyze a stock first");
        return;
    }

    const data = globalStockData;
    const priceChartImage = document.getElementById("priceChart").toDataURL("image/png");
    const volatilityChartImage = document.getElementById("volatilityChart").toDataURL("image/png");

    const ma5Val = data.ma5[data.ma5.length - 1];
    const ma50Val = data.ma50[data.ma50.length - 1];
    const ma100Val = data.ma100[data.ma100.length - 1];

    let trendText = "Neutral Trend";
    let trendColor = "#f59e0b"; // amber
    if (data.latest_price > ma50Val && ma50Val > ma100Val) {
        trendText = "Bullish Crossover Coded";
        trendColor = "#10b981"; // emerald
    } else if (data.latest_price < ma50Val && ma50Val < ma100Val) {
        trendText = "Bearish Crossover Coded";
        trendColor = "#ef4444"; // rose
    }

    const reportHTML = `
        <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; padding: 40px; color: #111827; background-color: #ffffff; line-height: 1.5;">
            
            <!-- Report Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px;">
                <div>
                    <h1 style="font-size: 24px; font-weight: 700; color: #1e1b4b; margin: 0; font-family: 'Outfit', sans-serif;">Antigravity Risk Analytics</h1>
                    <p style="font-size: 13px; color: #6b7280; margin: 5px 0 0 0;">Statistical Volatility & Trend Forecast Report</p>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 14px; font-weight: 600; color: #4f46e5;">Symbol: ${data.symbol}</div>
                    <div style="font-size: 12px; color: #6b7280;">Exchange: ${data.exchange_symbol}</div>
                </div>
            </div>

            <!-- Meta Details Grid -->
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 35px; background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 12px; padding: 20px;">
                <div>
                    <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600; letter-spacing: 0.05em;">Financial Indicators</div>
                    <div style="margin-top: 10px; font-size: 14px;">
                        <strong style="color: #374151;">Latest Close Price:</strong> <span style="font-weight: 600;">₹${data.latest_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style="margin-top: 8px; font-size: 14px;">
                        <strong style="color: #374151;">30D Volatility:</strong> <span style="font-weight: 600;">${(data.latest_volatility * 100).toFixed(2)}%</span>
                    </div>
                    <div style="margin-top: 8px; font-size: 14px;">
                        <strong style="color: #374151;">EWMA Predicted Risk:</strong> <span style="font-weight: 600;">${(data.latest_predicted_volatility * 100).toFixed(2)}%</span>
                    </div>
                </div>
                <div>
                    <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600; letter-spacing: 0.05em;">Trend & Valuation</div>
                    <div style="margin-top: 10px; font-size: 14px;">
                        <strong style="color: #374151;">MA 5 (Short Term):</strong> <span style="font-weight: 600;">₹${ma5Val.toFixed(2)}</span>
                    </div>
                    <div style="margin-top: 8px; font-size: 14px;">
                        <strong style="color: #374151;">MA 50 (Med Term):</strong> <span style="font-weight: 600;">₹${ma50Val.toFixed(2)}</span>
                    </div>
                    <div style="margin-top: 8px; font-size: 14px;">
                        <strong style="color: #374151;">Trend Direction:</strong> 
                        <span style="font-weight: 700; color: ${trendColor}; text-transform: uppercase; font-size: 12px; background: ${trendColor}15; padding: 3px 8px; border-radius: 4px;">
                            ${trendText}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Price Visualizations -->
            <div style="margin-bottom: 30px; page-break-inside: avoid;">
                <h3 style="font-size: 16px; font-weight: 600; color: #1e1b4b; border-left: 3px solid #6366f1; padding-left: 10px; margin-bottom: 15px;">Stock Price & Moving Averages</h3>
                <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; text-align: center; background: #ffffff;">
                    <img src="${priceChartImage}" style="max-width:100%; height:260px; object-fit: contain;">
                </div>
            </div>

            <!-- Volatility Visualizations -->
            <div style="margin-bottom: 30px; page-break-inside: avoid;">
                <h3 style="font-size: 16px; font-weight: 600; color: #1e1b4b; border-left: 3px solid #06b6d4; padding-left: 10px; margin-bottom: 15px;">Risk Analytics & Volatility Bands</h3>
                <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; text-align: center; background: #ffffff;">
                    <img src="${volatilityChartImage}" style="max-width:100%; height:260px; object-fit: contain;">
                </div>
            </div>

            <!-- Footer Details -->
            <div style="margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 15px; font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between;">
                <span>Report generated by user: ${getCurrentUser()?.name || "User"}</span>
                <span>Date: ${new Date().toLocaleString()}</span>
            </div>
            
        </div>
    `;

    const element = document.createElement("div");
    element.innerHTML = reportHTML;

    const opt = {
        margin:       10,
        filename:     `${data.symbol}-stock-analysis.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(element).set(opt).save();
}

/**
 * Autocomplete Ticker Search Logic
 */
const tickerInput = document.getElementById("tickerInput");
const suggestionsBox = document.getElementById("suggestions");

tickerInput.addEventListener("input", async function () {
    const query = this.value.trim();

    if (query.length < 1) {
        suggestionsBox.innerHTML = "";
        return;
    }

    try {
        const response = await fetch(`http://127.0.0.1:5000/api/search-stocks?q=${query}`);
        
        if (!response.ok) return;

        const results = await response.json();
        suggestionsBox.innerHTML = "";

        // Deduplicate and cap search responses
        const filteredResults = results.slice(0, 15);

        filteredResults.forEach(stock => {
            const div = document.createElement("div");
            div.classList.add("suggestion-item");
            
            let badgeClass = "badge-other";
            let exchangeLabel = stock.exchange || "US";
            if (exchangeLabel === "NSE") {
                badgeClass = "badge-nse";
            } else if (exchangeLabel === "BSE") {
                badgeClass = "badge-bse";
            }
            
            div.innerHTML = `
                <div class="suggestion-info">
                    <span class="suggestion-symbol">${stock.symbol}</span>
                    <span class="suggestion-name">${stock.name}</span>
                </div>
                <span class="suggestion-badge ${badgeClass}">${exchangeLabel}</span>
            `;
            
            div.addEventListener("click", () => {
                tickerInput.value = stock.symbol;
                suggestionsBox.innerHTML = "";
                // Automatically run analyze after suggestion pick
                analyzeStock();
            });

            suggestionsBox.appendChild(div);
        });

    } catch (error) {
        console.error("Autocomplete fetch error:", error);
    }
});

// Close search suggestions list when clicking outside
document.addEventListener("click", function(event) {
    if (event.target !== tickerInput && event.target !== suggestionsBox) {
        suggestionsBox.innerHTML = "";
    }
});