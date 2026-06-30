let globalStockData = null;
let baselineStockData = null; // Store baseline data at lambda = 0.94
let sessionHistory = [];      // Keep track of analyzed stocks in the session

/**
 * Tab Navigation Controller
 */
function initTabs() {
    const navItems = {
        'nav-dashboard': { tabId: 'tab-dashboard', title: 'Market Volatility & Trend Panel', subtitle: 'Real-time statistical modeling, EWMA risk forecasts, and Moving Average crossovers' },
        'nav-analysis': { tabId: 'tab-risk-models', title: 'Risk Analytics & Model Parameters', subtitle: 'Tuning and simulating volatility forecasts with custom decay parameters' },
        'nav-reports': { tabId: 'tab-reports', title: 'Report Center & Document Generator', subtitle: 'Generate and export customized volatility research and historical logs' }
    };

    Object.keys(navItems).forEach(navId => {
        const link = document.getElementById(navId);
        if (link) {
            // Remove any existing event listener by cloning (in case called twice)
            const newLink = link.cloneNode(true);
            link.parentNode.replaceChild(newLink, link);
            
            newLink.addEventListener('click', (e) => {
                e.preventDefault();
                switchTab(navId);
            });
        }
    });
}

function switchTab(activeNavId) {
    const navItems = {
        'nav-dashboard': { tabId: 'tab-dashboard', title: 'Market Volatility & Trend Panel', subtitle: 'Real-time statistical modeling, EWMA risk forecasts, and Moving Average crossovers' },
        'nav-analysis': { tabId: 'tab-risk-models', title: 'Risk Analytics & Model Parameters', subtitle: 'Tuning and simulating volatility forecasts with custom decay parameters' },
        'nav-reports': { tabId: 'tab-reports', title: 'Report Center & Document Generator', subtitle: 'Generate and export customized volatility research and historical logs' }
    };

    // Update active nav links style
    Object.keys(navItems).forEach(navId => {
        const link = document.getElementById(navId);
        if (link) {
            if (navId === activeNavId) {
                link.parentElement.classList.add('active');
                document.getElementById(navItems[navId].tabId).style.display = 'block';
                document.getElementById(navItems[navId].tabId).classList.add('active');
            } else {
                link.parentElement.classList.remove('active');
                document.getElementById(navItems[navId].tabId).style.display = 'none';
                document.getElementById(navItems[navId].tabId).classList.remove('active');
            }
        }
    });

    // Update Headings
    document.getElementById('mainHeaderTitle').innerText = navItems[activeNavId].title;
    document.getElementById('mainHeaderSubtitle').innerText = navItems[activeNavId].subtitle;

    // Tab-specific load triggers
    if (activeNavId === 'nav-analysis') {
        refreshRiskModelTab();
    } else if (activeNavId === 'nav-reports') {
        renderHistoryTable();
    }
}

/**
 * Refresh the Risk Model tab's simulation display based on active ticker
 */
function refreshRiskModelTab() {
    const simCard = document.getElementById('riskModelSimulationCard');
    const emptyState = document.getElementById('riskModelEmptyState');
    const slider = document.getElementById('lambdaSlider');

    if (!globalStockData) {
        simCard.style.display = 'none';
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'block';
        if (simCard) simCard.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';
        
        document.getElementById('simTickerBadge').innerText = globalStockData.symbol;

        // Reset slider to the active stock's lambda
        const currentLambda = globalStockData.lambda || 0.94;
        slider.value = currentLambda;
        document.getElementById('lambdaVal').innerText = currentLambda.toFixed(2);
        document.getElementById('simTunedLambdaText').innerText = currentLambda.toFixed(2);

        // Update stats
        const baselineVal = baselineStockData ? baselineStockData.latest_predicted_volatility : globalStockData.latest_predicted_volatility;
        const tunedVal = globalStockData.latest_predicted_volatility;
        const shiftVal = (tunedVal - baselineVal) * 100;

        document.getElementById('simBaselineVal').innerText = `${(baselineVal * 100).toFixed(2)}%`;
        document.getElementById('simTunedVal').innerText = `${(tunedVal * 100).toFixed(2)}%`;

        const sign = shiftVal >= 0 ? '+' : '';
        document.getElementById('simShiftVal').innerHTML = `<span style="color: ${shiftVal >= 0 ? 'var(--accent-warning)' : 'var(--accent-success)'}; font-weight:700;">${sign}${shiftVal.toFixed(2)}%</span>`;

        // Render comparative chart
        const limitDropdown = document.getElementById("limit");
        const lookback = parseInt(limitDropdown.value);

        if (window.renderRiskModelComparisonChart && baselineStockData) {
            window.renderRiskModelComparisonChart(
                'riskModelChart',
                baselineStockData.predicted_volatility.slice(-lookback),
                globalStockData.predicted_volatility.slice(-lookback),
                globalStockData.volatility.slice(-lookback),
                globalStockData.dates.slice(-lookback)
            );
        }
    }
}

/**
 * Handle EWMA decay factor slider values dynamically
 */
const lambdaSlider = document.getElementById("lambdaSlider");
if (lambdaSlider) {
    lambdaSlider.addEventListener("input", function() {
        document.getElementById("lambdaVal").innerText = parseFloat(this.value).toFixed(2);
    });
}

/**
 * Recalculate EWMA Volatility based on customized lambda decay parameter
 */
async function handleLambdaChange() {
    if (!globalStockData) {
        alert("Please analyze a stock ticker on the Dashboard first.");
        return;
    }

    const symbol = globalStockData.symbol;
    const lambda = parseFloat(document.getElementById("lambdaSlider").value);
    const updateBtn = document.getElementById("updateLambdaBtn");

    updateBtn.disabled = true;
    updateBtn.innerText = "⏳ Simulating...";

    try {
        const response = await fetch(`http://127.0.0.1:5000/api/stock-details?symbol=${symbol}&lambda=${lambda}`);
        if (!response.ok) {
            throw new Error("Failed to simulate model with selected lambda");
        }

        const data = await response.json();
        
        // Update active global dataset (but do not change baselineStockData which stays at 0.94)
        globalStockData = data;

        // Render updated components on the Risk Models tab
        refreshRiskModelTab();

    } catch (error) {
        console.error("Lambda recalculation failed:", error);
        alert(error.message || "Failed to recalculate EWMA Volatility.");
    } finally {
        updateBtn.disabled = false;
        updateBtn.innerText = "Recalculate EWMA";
    }
}

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
        // Fetch baseline data with default lambda (0.94)
        const response = await fetch(`http://127.0.0.1:5000/api/stock-details?symbol=${symbol}&lambda=0.94`);
        
        if (!response.ok) {
            throw new Error(response.status === 404 ? "Ticker not found. Please try another symbol." : "Server error occurred.");
        }

        const data = await response.json();
        globalStockData = data;
        baselineStockData = data; // Save baseline instance

        if (data.error) {
            alert(data.error);
            resetDashboardView();
            return;
        }

        // Add to Session Logs History
        addToSessionHistory(data);

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
    baselineStockData = null;
}

// Re-render when limit lookback changes
const limitSelect = document.getElementById("limit");
if (limitSelect) {
    limitSelect.addEventListener("change", function () {
        if (globalStockData) {
            renderCharts(globalStockData);
            updateMetricCards(globalStockData);
            renderDetailedSummaryTable(globalStockData);
        }
    });
}

/**
 * Maintain session history entries
 */
function addToSessionHistory(data) {
    const existingIndex = sessionHistory.findIndex(item => item.symbol === data.symbol);
    if (existingIndex !== -1) {
        sessionHistory[existingIndex] = data; // Update
    } else {
        sessionHistory.unshift(data); // Append to top
    }
}

/**
 * Render historical search table logs
 */
function renderHistoryTable() {
    const tbody = document.getElementById("historyTableBody");
    if (!tbody) return;

    if (sessionHistory.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
                    No recent stock analyses logged in this session
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = "";
    sessionHistory.forEach(data => {
        const row = document.createElement("tr");
        row.style.borderBottom = "1px solid rgba(255, 255, 255, 0.05)";
        
        row.innerHTML = `
            <td style="padding: 12px; font-weight: 600; font-family: var(--font-display); color: var(--text-primary);">${data.symbol}</td>
            <td style="padding: 12px; color: var(--text-secondary);">₹${data.latest_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td style="padding: 12px; color: var(--text-secondary);">${(data.latest_volatility * 100).toFixed(2)}%</td>
            <td style="padding: 12px; color: var(--text-secondary);">${(data.latest_predicted_volatility * 100).toFixed(2)}% (λ=${(data.lambda || 0.94).toFixed(2)})</td>
            <td style="padding: 12px; text-align: right;">
                <div style="display: flex; gap: 8px; justify-content: flex-end;">
                    <button onclick="loadTicker('${data.symbol}')" class="btn-primary" style="padding: 6px 12px; font-size: 0.75rem; border-radius: 6px; font-weight:500; cursor: pointer;">
                        Load
                    </button>
                    <button onclick="downloadSessionPDF('${data.symbol}')" class="btn-secondary" style="padding: 6px 12px; font-size: 0.75rem; border-radius: 6px; font-weight:500; cursor: pointer;">
                        PDF
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function loadTicker(symbol) {
    document.getElementById("tickerInput").value = symbol;
    switchTab("nav-dashboard");
    analyzeStock();
}

function downloadSessionPDF(symbol) {
    const data = sessionHistory.find(item => item.symbol === symbol);
    if (!data) return;
    
    // Set globalStockData temporarily to download report for this historical stock
    const prevGlobal = globalStockData;
    globalStockData = data;
    downloadPDF();
    globalStockData = prevGlobal;
}

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
        trendText = "Bullish Crossover";
        trendColor = "#10b981"; // emerald
    } else if (data.latest_price < ma50Val && ma50Val < ma100Val) {
        trendText = "Bearish Crossover";
        trendColor = "#ef4444"; // rose
    }

    const reportHTML = getReportTemplate(data, {
        themeColor: '#6366f1',
        themeBgHighlight: 'rgba(99, 102, 241, 0.08)',
        themeName: 'Indigo',
        includePriceChart: true,
        includeVolChart: true,
        priceChartImage,
        volatilityChartImage,
        ma5Val,
        ma50Val,
        ma100Val,
        trendText,
        trendColor
    });

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
 * Generate Custom PDF Report based on selections
 */
function downloadCustomPDF() {
    if (!globalStockData) {
        alert("Please analyze a stock first");
        return;
    }

    // Read Custom Settings
    const themes = {
        indigo: { hex: '#6366f1', bgHighlight: 'rgba(99, 102, 241, 0.08)', name: 'Indigo' },
        emerald: { hex: '#10b981', bgHighlight: 'rgba(16, 185, 129, 0.08)', name: 'Emerald' },
        cyan: { hex: '#06b6d4', bgHighlight: 'rgba(6, 182, 212, 0.08)', name: 'Cyan' }
    };

    const selectedThemeVal = document.querySelector('input[name="reportTheme"]:checked').value;
    const activeTheme = themes[selectedThemeVal] || themes.indigo;

    const includePriceChart = document.getElementById("repIncPriceChart").checked;
    const includeVolChart = document.getElementById("repIncVolChart").checked;

    const data = globalStockData;
    const priceChartImage = includePriceChart ? document.getElementById("priceChart").toDataURL("image/png") : null;
    const volatilityChartImage = includeVolChart ? document.getElementById("volatilityChart").toDataURL("image/png") : null;

    const ma5Val = data.ma5[data.ma5.length - 1];
    const ma50Val = data.ma50[data.ma50.length - 1];
    const ma100Val = data.ma100[data.ma100.length - 1];

    let trendText = "Neutral Trend";
    let trendColor = "#f59e0b"; // amber
    if (data.latest_price > ma50Val && ma50Val > ma100Val) {
        trendText = "Bullish Crossover";
        trendColor = "#10b981"; // emerald
    } else if (data.latest_price < ma50Val && ma50Val < ma100Val) {
        trendText = "Bearish Crossover";
        trendColor = "#ef4444"; // rose
    }

    const reportHTML = getReportTemplate(data, {
        themeColor: activeTheme.hex,
        themeBgHighlight: activeTheme.bgHighlight,
        themeName: activeTheme.name,
        includePriceChart,
        includeVolChart,
        priceChartImage,
        volatilityChartImage,
        ma5Val,
        ma50Val,
        ma100Val,
        trendText,
        trendColor
    });

    const element = document.createElement("div");
    element.innerHTML = reportHTML;

    const opt = {
        margin:       10,
        filename:     `${data.symbol}-custom-${activeTheme.name.toLowerCase()}-report.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(element).set(opt).save();
}

/**
 * Standard Report Template Helper
 */
function getReportTemplate(data, config) {
    return `
        <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; padding: 40px; color: #111827; background-color: #ffffff; line-height: 1.5;">
            
            <!-- Report Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px;">
                <div>
                    <h1 style="font-size: 24px; font-weight: 700; color: #1e1b4b; margin: 0; font-family: 'Outfit', sans-serif;">Stock Volatility Analysis Report</h1>
                    <p style="font-size: 13px; color: #6b7280; margin: 5px 0 0 0;">Report Theme: ${config.themeName} | Decay Parameter (λ): ${(data.lambda || 0.94).toFixed(2)}</p>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 14px; font-weight: 600; color: ${config.themeColor};">Symbol: ${data.symbol}</div>
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
                        <strong style="color: #374151;">MA 5 (Short Term):</strong> <span style="font-weight: 600;">₹${config.ma5Val.toFixed(2)}</span>
                    </div>
                    <div style="margin-top: 8px; font-size: 14px;">
                        <strong style="color: #374151;">MA 50 (Med Term):</strong> <span style="font-weight: 600;">₹${config.ma50Val.toFixed(2)}</span>
                    </div>
                    <div style="margin-top: 8px; font-size: 14px;">
                        <strong style="color: #374151;">Trend Direction:</strong> 
                        <span style="font-weight: 700; color: ${config.trendColor}; text-transform: uppercase; font-size: 12px; background: ${config.trendColor}15; padding: 3px 8px; border-radius: 4px;">
                            ${config.trendText}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Price Visualizations -->
            ${config.includePriceChart ? `
            <div style="margin-bottom: 30px; page-break-inside: avoid;">
                <h3 style="font-size: 16px; font-weight: 600; color: #1e1b4b; border-left: 3px solid ${config.themeColor}; padding-left: 10px; margin-bottom: 15px;">Stock Price & Moving Averages</h3>
                <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; text-align: center; background: #ffffff;">
                    <img src="${config.priceChartImage}" style="max-width:100%; height:260px; object-fit: contain;">
                </div>
            </div>
            ` : ''}

            <!-- Volatility Visualizations -->
            ${config.includeVolChart ? `
            <div style="margin-bottom: 30px; page-break-inside: avoid;">
                <h3 style="font-size: 16px; font-weight: 600; color: #1e1b4b; border-left: 3px solid ${config.themeColor}; padding-left: 10px; margin-bottom: 15px;">Risk Analytics & Volatility Bands (EWMA)</h3>
                <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; text-align: center; background: #ffffff;">
                    <img src="${config.volatilityChartImage}" style="max-width:100%; height:260px; object-fit: contain;">
                </div>
            </div>
            ` : ''}

            <!-- Footer Details -->
            <div style="margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 15px; font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between;">
                <span>Report Generated by: Stock Risk Analyst System</span>
                <span>Date: ${new Date().toLocaleString()}</span>
            </div>
            
        </div>
    `;
}

/**
 * Autocomplete Ticker Search Logic
 */
const tickerInput = document.getElementById("tickerInput");
const suggestionsBox = document.getElementById("suggestions");

if (tickerInput && suggestionsBox) {
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
                    analyzeStock();
                });

                suggestionsBox.appendChild(div);
            });

        } catch (error) {
            console.error("Autocomplete fetch error:", error);
        }
    });

    document.addEventListener("click", function(event) {
        if (event.target !== tickerInput && event.target !== suggestionsBox) {
            suggestionsBox.innerHTML = "";
        }
    });
}

// Initialise Tabs Navigation Controller
initTabs();