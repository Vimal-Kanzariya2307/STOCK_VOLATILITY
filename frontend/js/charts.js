let priceChart;
let volatilityChart;

// Global Chart.js Configuration Defaults for Premium Dark Theme
Chart.defaults.color = '#9ca3af';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.boxWidth = 8;
Chart.defaults.plugins.legend.labels.padding = 15;

function renderCharts(data) {
    const daysDropdown = document.getElementById("limit");
    const selectedDays = parseInt(daysDropdown.value);

    // Slice last N days
    const labels = data.dates.slice(-selectedDays);
    const prices = data.prices.slice(-selectedDays);
    const ma5 = data.ma5.slice(-selectedDays);
    const ma10 = data.ma10.slice(-selectedDays);
    const ma50 = data.ma50.slice(-selectedDays);
    const ma100 = data.ma100.slice(-selectedDays);
    const volatility = data.volatility.slice(-selectedDays);
    const predictedVol = data.predicted_volatility.slice(-selectedDays);

    if (priceChart) priceChart.destroy();
    if (volatilityChart) volatilityChart.destroy();

    const canvas1 = document.getElementById("priceChart");
    const canvas2 = document.getElementById("volatilityChart");
    
    const ctx1 = canvas1.getContext("2d");
    const ctx2 = canvas2.getContext("2d");

    // Create a beautiful linear gradient for Price Chart fill
    const priceGradient = ctx1.createLinearGradient(0, 0, 0, 300);
    priceGradient.addColorStop(0, 'rgba(99, 102, 241, 0.25)'); // Indigo semi-transparent
    priceGradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');  // fully transparent

    priceChart = new Chart(ctx1, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Price",
                    data: prices,
                    borderColor: "#6366f1", // Indigo Accent
                    borderWidth: 2.5,
                    fill: true,
                    backgroundColor: priceGradient,
                    tension: 0.15,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: "#6366f1",
                    pointHoverBorderColor: "#ffffff",
                    pointHoverBorderWidth: 1.5
                },
                {
                    label: "MA 5",
                    data: ma5,
                    borderColor: "#ec4899", // Pink
                    borderWidth: 1.2,
                    borderDash: [2, 2],
                    pointRadius: 0,
                    tension: 0.1
                },
                {
                    label: "MA 10",
                    data: ma10,
                    borderColor: "#3b82f6", // Blue
                    borderWidth: 1.2,
                    pointRadius: 0,
                    tension: 0.1
                },
                {
                    label: "MA 50",
                    data: ma50,
                    borderColor: "#10b981", // Emerald Green
                    borderWidth: 1.5,
                    pointRadius: 0,
                    tension: 0.1
                },
                {
                    label: "MA 100",
                    data: ma100,
                    borderColor: "#f59e0b", // Amber
                    borderWidth: 1.8,
                    pointRadius: 0,
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: "index",
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end'
                },
                tooltip: {
                    backgroundColor: 'rgba(11, 15, 25, 0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#e5e7eb',
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                    borderWidth: 1,
                    padding: 12,
                    boxWidth: 8,
                    boxPadding: 4,
                    usePointStyle: true,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += '₹' + context.parsed.y.toLocaleString('en-IN', { minimumFractionDigits: 2 });
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.03)',
                        borderColor: 'transparent'
                    },
                    ticks: {
                        maxTicksLimit: 8,
                        color: '#9ca3af'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        borderColor: 'transparent'
                    },
                    ticks: {
                        color: '#9ca3af',
                        callback: function(value) {
                            return '₹' + value;
                        }
                    }
                }
            }
        }
    });

    // Create a beautiful linear gradient for Volatility Chart fill
    const volGradient = ctx2.createLinearGradient(0, 0, 0, 300);
    volGradient.addColorStop(0, 'rgba(6, 182, 212, 0.2)'); // Cyan semi-transparent
    volGradient.addColorStop(1, 'rgba(6, 182, 212, 0.0)');  // fully transparent

    volatilityChart = new Chart(ctx2, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Rolling Volatility (30D)",
                    data: volatility,
                    borderColor: "#06b6d4", // Cyan Accent
                    borderWidth: 2.2,
                    fill: true,
                    backgroundColor: volGradient,
                    tension: 0.2,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: "#06b6d4",
                    pointHoverBorderColor: "#ffffff",
                    pointHoverBorderWidth: 1.5
                },
                {
                    label: "EWMA Predicted Risk",
                    data: predictedVol,
                    borderColor: "#f59e0b", // Amber Accent
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.2,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: "#f59e0b",
                    pointHoverBorderColor: "#ffffff",
                    pointHoverBorderWidth: 1.5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: "index",
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end'
                },
                tooltip: {
                    backgroundColor: 'rgba(11, 15, 25, 0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#e5e7eb',
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                    borderWidth: 1,
                    padding: 12,
                    boxWidth: 8,
                    boxPadding: 4,
                    usePointStyle: true,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += (context.parsed.y * 100).toFixed(2) + '%';
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.03)',
                        borderColor: 'transparent'
                    },
                    ticks: {
                        maxTicksLimit: 8,
                        color: '#9ca3af'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        borderColor: 'transparent'
                    },
                    ticks: {
                        color: '#9ca3af',
                        callback: function(value) {
                            return (value * 100).toFixed(0) + '%';
                        }
                    }
                }
            }
        }
    });
}
