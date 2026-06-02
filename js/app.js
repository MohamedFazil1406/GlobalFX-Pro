/**
 * GlobalFX Pro - Main App Orchestrator
 * Wires up modules, schedules network rate syncs, and binds system events.
 */

// Application State
const appState = {
  rates: {},
  fromCurrency: "USD",
  toCurrency: "EUR",
  activeTimeframe: "30D",
  isDarkMode: true,
  lastCalculatedAmount: 0.00
};

// Global reference for statistics transitions
let prevStats = { totalConversions: 0, averageAmount: 0 };
let uiManager;

/**
 * Recalculates conversion estimate based on amount input
 */
function handleCalculation() {
  const fromAmountInput = document.getElementById("converter-amount-from");
  const toAmountInput = document.getElementById("converter-amount-to");
  if (!fromAmountInput || !toAmountInput) return;

  const amount = parseFloat(fromAmountInput.value);
  if (isNaN(amount) || amount <= 0) {
    toAmountInput.value = "";
    return;
  }

  const result = CurrencyConverter.convert(amount, appState.fromCurrency, appState.toCurrency, appState.rates);
  toAmountInput.value = result.toFixed(2);
  appState.lastCalculatedAmount = result;
}

/**
 * Wires up details for charts rendering
 */
function drawChart() {
  const base = appState.fromCurrency;
  const target = appState.toCurrency;
  
  const rateBase = appState.rates[base] || 1;
  const rateTarget = appState.rates[target] || 1;
  const currentRate = rateTarget / rateBase;

  // Generate historical data
  const chartData = CurrencyAPI.generateHistoricalRates(base, target, appState.activeTimeframe, currentRate);
  
  // Render Chart
  ChartManager.renderHistoricalChart("fx-history-chart", chartData, appState.isDarkMode);

  // Update visual text titles
  const chartTitle = document.getElementById("chart-currency-pair");
  if (chartTitle) chartTitle.textContent = `${base} / ${target} Trend`;

  const chartRateVal = document.getElementById("chart-rate-value");
  if (chartRateVal) {
    const targetSymbol = CurrencyAPI.CURRENCY_DETAILS[target]?.symbol || "";
    chartRateVal.textContent = `${targetSymbol}${currentRate.toFixed(4)}`;
  }

  const chartChangePct = document.getElementById("chart-change-percentage");
  if (chartChangePct) {
    const sign = chartData.percentChange >= 0 ? "+" : "";
    chartChangePct.textContent = `${sign}${chartData.percentChange.toFixed(2)}%`;
    chartChangePct.className = "chart-change-pct " + (chartData.percentChange >= 0 ? "trend-up" : "trend-down");
  }

  // Update timeframe trends
  const trends = CurrencyAPI.getExchangeRateTrends(base, target, currentRate);
  uiManager.renderTrendAnalysisPanel(trends, base, target);
}

/**
 * Updates full dashboard modules
 */
function refreshDashboard() {
  const history = StorageManager.getConversionHistory();
  const favorites = StorageManager.getFavoritePairs();
  
  // 1. Calculate and update dashboard summaries
  const stats = AnalyticsManager.calculateAnalyticsSummary(appState.rates, history, favorites);
  uiManager.renderAnalyticsDashboard(stats, prevStats);
  
  // Cache stats for transition animations
  prevStats.totalConversions = stats.totalConversions;
  prevStats.averageAmount = stats.averageConversionAmountUsd;

  // 2. Render recent list
  uiManager.renderConversionHistory(history);

  // 3. Render cross comparison table
  uiManager.renderComparisonTable(appState.fromCurrency, appState.rates);

  // 4. Update live conversion display
  const base = appState.fromCurrency;
  const target = appState.toCurrency;
  const currentRate = (appState.rates[target] || 1) / (appState.rates[base] || 1);
  uiManager.updateConversionDisplay(currentRate, base, target);
  uiManager.updateVolatilityDisplay(base, target);

  // 5. Market Insights
  const marketOverview = AnalyticsManager.getMarketOverview(appState.rates);
  uiManager.renderMarketOverview(marketOverview);
}

/**
 * App initialization orchestrator
 */
async function initializeApplication() {
  // Bind inputs value changed
  const fromAmountInput = document.getElementById("converter-amount-from");
  if (fromAmountInput) {
    fromAmountInput.addEventListener("input", handleCalculation);
  }

  // Bind Chart Timeframes selector
  const timeframeButtons = document.querySelectorAll(".timeframe-btn");
  timeframeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      timeframeButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      appState.activeTimeframe = btn.getAttribute("data-period");
      drawChart();
    });
  });

  // Create UI Controller Instance
  uiManager = new UIManager(appState, {
    onCurrencyChange: (type, code) => {
      handleCalculation();
      drawChart();
      // Render comparison table base update
      uiManager.renderComparisonTable(appState.fromCurrency, appState.rates);
      
      const currentRate = (appState.rates[appState.toCurrency] || 1) / (appState.rates[appState.fromCurrency] || 1);
      uiManager.updateConversionDisplay(currentRate, appState.fromCurrency, appState.toCurrency);
      uiManager.updateVolatilityDisplay(appState.fromCurrency, appState.toCurrency);
    },
    
    onSwap: () => {
      handleCalculation();
      drawChart();
      uiManager.renderComparisonTable(appState.fromCurrency, appState.rates);
      
      const currentRate = (appState.rates[appState.toCurrency] || 1) / (appState.rates[appState.fromCurrency] || 1);
      uiManager.updateConversionDisplay(currentRate, appState.fromCurrency, appState.toCurrency);
      uiManager.updateVolatilityDisplay(appState.fromCurrency, appState.toCurrency);
    },

    onThemeChange: (isDark) => {
      appState.isDarkMode = isDark;
      drawChart(); // Redraw chart grids
    },

    onConvertSubmit: () => {
      const amount = parseFloat(fromAmountInput.value);
      const toAmountInput = document.getElementById("converter-amount-to");
      if (isNaN(amount) || amount <= 0 || !toAmountInput.value) {
        uiManager.showToast("Please enter a valid amount to convert", "warning");
        return;
      }

      const result = parseFloat(toAmountInput.value);
      CurrencyConverter.commitTransaction(
        appState.fromCurrency,
        appState.toCurrency,
        amount,
        result,
        appState.rates
      );

      refreshDashboard();
      uiManager.showToast(`Converted ${amount} ${appState.fromCurrency} to ${appState.toCurrency} successfully!`, "success");
    },

    onExportCSV: () => {
      const history = StorageManager.getConversionHistory();
      const exportRes = ExportManager.exportToCSV(history);
      if (exportRes && !exportRes.success) {
        uiManager.showToast(exportRes.message, "warning");
      } else {
        uiManager.showToast("Conversion history exported to CSV", "success");
      }
    },

    onClearHistory: () => {
      StorageManager.clearConversionHistory();
      refreshDashboard();
      uiManager.showToast("Conversion history cleared", "success");
    },

    onFavoriteToggle: () => {
      const pair = `${appState.fromCurrency}/${appState.toCurrency}`;
      StorageManager.toggleFavoritePair(pair);
      
      refreshDashboard();
      drawChart();
      uiManager.showToast("Updated favorites configuration", "success");
    },

    onViewChange: (view) => {
      if (view === "dashboard" || view === "analytics") {
        // Redraw canvas with small timeout to allow window styles layout
        setTimeout(() => drawChart(), 50);
      }
    }
  });

  // Run UI setups
  uiManager.init();

  // Load live rate data from API
  try {
    appState.rates = await CurrencyAPI.fetchExchangeRates();
    
    // Set status
    const statusLabel = document.getElementById("connection-status");
    if (statusLabel) {
      statusLabel.textContent = "Live Market Rates Connected";
    }
  } catch (error) {
    console.error("Rates fetch error:", error);
    uiManager.showToast("Network offline. Loaded offline rates fallback.", "warning");
  }

  // Set default currency values
  uiManager.selectors.from.setValue(appState.fromCurrency);
  uiManager.selectors.to.setValue(appState.toCurrency);

  // Set initial calculation values
  if (fromAmountInput) {
    fromAmountInput.value = "1000";
    handleCalculation();
  }

  // Render lists and components
  const movers = CurrencyAPI.getTopMovers(appState.rates);
  uiManager.renderMovers(movers);
  refreshDashboard();
  drawChart();

  // Start rates pooling (sync rates every 5 minutes)
  setInterval(async () => {
    appState.rates = await CurrencyAPI.fetchExchangeRates();
    refreshDashboard();
  }, 300000);
}

// Fire launch on load
document.addEventListener("DOMContentLoaded", initializeApplication);
