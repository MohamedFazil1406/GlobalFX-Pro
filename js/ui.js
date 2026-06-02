/**
 * GlobalFX Pro - UI Manager
 * Handles responsive view rendering, theme switches, custom searchable selectors, and interactive animations.
 */

class UIManager {
  constructor(appState, callbacks = {}) {
    this.state = appState;
    this.callbacks = callbacks;
    this.selectors = {};
  }

  /**
   * Initializes all interface controls and binds base event listeners
   */
  init() {
    this.setupTheme();
    this.setupNavigation();
    this.setupSearchableSelectors();
    this.setupEventListeners();
    this.setupRipples();
  }

  /**
   * Sets up theme based on storage settings
   */
  setupTheme() {
    const savedTheme = StorageManager.getTheme();
    const themeBtn = document.getElementById("theme-toggle-trigger");
    
    if (savedTheme === "light") {
      document.body.classList.add("light-theme");
      if (themeBtn) themeBtn.textContent = "☀️";
      this.state.isDarkMode = false;
    } else {
      document.body.classList.remove("light-theme");
      if (themeBtn) themeBtn.textContent = "🌙";
      this.state.isDarkMode = true;
    }
  }

  /**
   * Toggles theme and updates charts & storage
   */
  toggleTheme() {
    const themeBtn = document.getElementById("theme-toggle-trigger");
    this.state.isDarkMode = !this.state.isDarkMode;

    if (this.state.isDarkMode) {
      document.body.classList.remove("light-theme");
      if (themeBtn) themeBtn.textContent = "🌙";
      StorageManager.saveTheme("dark");
    } else {
      document.body.classList.add("light-theme");
      if (themeBtn) themeBtn.textContent = "☀️";
      StorageManager.saveTheme("light");
    }

    if (this.callbacks.onThemeChange) {
      this.callbacks.onThemeChange(this.state.isDarkMode);
    }
  }

  /**
   * Manages layout view switches and navigation tab active classes
   */
  setupNavigation() {
    const navTabs = document.querySelectorAll(".nav-tab");
    const viewSections = document.querySelectorAll(".view-section");

    navTabs.forEach(tab => {
      tab.addEventListener("click", (e) => {
        e.preventDefault();
        const targetView = tab.getAttribute("data-view");
        
        navTabs.forEach(t => t.classList.remove("active"));
        viewSections.forEach(s => s.classList.remove("active"));
        
        tab.classList.add("active");
        const targetSection = document.getElementById(`${targetView}-section`);
        if (targetSection) {
          targetSection.classList.add("active");
          targetSection.classList.add("fade-in");
          // Clean up animation class
          setTimeout(() => targetSection.classList.remove("fade-in"), 400);
        }
        
        if (this.callbacks.onViewChange) {
          this.callbacks.onViewChange(targetView);
        }
      });
    });
  }

  /**
   * Builds and activates the custom searchable selectors
   */
  setupSearchableSelectors() {
    this.selectors.from = this.createSearchableSelector(
      "from-currency-selector",
      this.state.fromCurrency,
      (code) => {
        this.state.fromCurrency = code;
        if (this.callbacks.onCurrencyChange) {
          this.callbacks.onCurrencyChange("from", code);
        }
      }
    );

    this.selectors.to = this.createSearchableSelector(
      "to-currency-selector",
      this.state.toCurrency,
      (code) => {
        this.state.toCurrency = code;
        if (this.callbacks.onCurrencyChange) {
          this.callbacks.onCurrencyChange("to", code);
        }
      }
    );
  }

  /**
   * Dynamic factory method to build a custom searchable select dropdown
   */
  createSearchableSelector(containerId, defaultVal, onChangeCallback) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    container.innerHTML = "";
    container.className = "custom-select-container";

    // Create trigger button
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "custom-select-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");

    const defaultFlag = CurrencyAPI.CURRENCY_DETAILS[defaultVal]?.flag || "un";
    trigger.innerHTML = `
      <img class="select-trigger-flag" src="https://flagcdn.com/w40/${defaultFlag}.png" alt="${defaultVal}">
      <span class="select-trigger-text">${defaultVal} - ${CurrencyAPI.CURRENCY_DETAILS[defaultVal]?.name || defaultVal}</span>
      <span class="select-trigger-arrow">▼</span>
    `;
    container.appendChild(trigger);

    // Create dropdown panel
    const dropdown = document.createElement("div");
    dropdown.className = "custom-select-dropdown";

    const searchContainer = document.createElement("div");
    searchContainer.className = "custom-select-search-container";
    
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.className = "custom-select-search-input";
    searchInput.placeholder = "Search by code, name, country...";
    searchContainer.appendChild(searchInput);
    dropdown.appendChild(searchContainer);

    // Options list
    const optionsList = document.createElement("ul");
    optionsList.className = "custom-select-options";
    optionsList.setAttribute("role", "listbox");
    dropdown.appendChild(optionsList);
    container.appendChild(dropdown);

    let selectedValue = defaultVal;
    let highlightedIndex = -1;
    let visibleOptions = [];

    // Render option items
    const renderOptions = (filterText = "") => {
      optionsList.innerHTML = "";
      visibleOptions = [];
      const query = filterText.toLowerCase().trim();

      Object.entries(CurrencyAPI.CURRENCY_DETAILS).forEach(([code, details]) => {
        const name = details.name.toLowerCase();
        const country = (details.country || "").toLowerCase();
        const codeLower = code.toLowerCase();

        // Search code, full currency name, or country name
        if (query === "" || codeLower.includes(query) || name.includes(query) || country.includes(query)) {
          const li = document.createElement("li");
          li.className = "custom-select-option";
          li.setAttribute("role", "option");
          li.setAttribute("data-value", code);
          
          if (code === selectedValue) {
            li.classList.add("selected");
            li.setAttribute("aria-selected", "true");
          }

          li.innerHTML = `
            <img class="custom-option-flag" src="https://flagcdn.com/w40/${details.flag}.png" alt="${code}">
            <span class="custom-option-code">${code}</span>
            <span class="custom-option-name">${details.name} (${details.country || ""})</span>
          `;
          
          optionsList.appendChild(li);
          visibleOptions.push(li);
        }
      });

      if (visibleOptions.length === 0) {
        const li = document.createElement("li");
        li.className = "custom-select-option disabled";
        li.style.color = "var(--text-muted)";
        li.style.cursor = "default";
        li.textContent = "No matches found";
        optionsList.appendChild(li);
      }
      
      highlightedIndex = -1;
    };

    renderOptions();

    // Toggle dropdown visibility
    const openDropdown = () => {
      // Close other dropdowns first
      document.querySelectorAll(".custom-select-dropdown").forEach(d => {
        if (d !== dropdown) d.classList.remove("show");
      });
      document.querySelectorAll(".custom-select-trigger").forEach(t => {
        if (t !== trigger) t.classList.remove("active");
      });

      dropdown.classList.add("show");
      trigger.classList.add("active");
      trigger.setAttribute("aria-expanded", "true");
      searchInput.value = "";
      renderOptions();
      setTimeout(() => searchInput.focus(), 50);
    };

    const closeDropdown = () => {
      dropdown.classList.remove("show");
      trigger.classList.remove("active");
      trigger.setAttribute("aria-expanded", "false");
    };

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.contains("show");
      if (isOpen) closeDropdown();
      else openDropdown();
    });

    // Dynamic filtering with debounce
    let searchTimeout;
    searchInput.addEventListener("input", () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        renderOptions(searchInput.value);
      }, 100);
    });

    searchInput.addEventListener("click", (e) => {
      e.stopPropagation(); // Avoid closing dropdown when typing in input
    });

    // Handle Option Selection
    optionsList.addEventListener("click", (e) => {
      const option = e.target.closest(".custom-select-option");
      if (!option || option.classList.contains("disabled")) return;

      const value = option.getAttribute("data-value");
      selectedValue = value;
      
      // Update trigger visual state
      const flag = CurrencyAPI.CURRENCY_DETAILS[value]?.flag || "un";
      trigger.innerHTML = `
        <img class="select-trigger-flag" src="https://flagcdn.com/w40/${flag}.png" alt="${value}">
        <span class="select-trigger-text">${value} - ${CurrencyAPI.CURRENCY_DETAILS[value]?.name || value}</span>
        <span class="select-trigger-arrow">▼</span>
      `;

      closeDropdown();
      onChangeCallback(value);
    });

    // Keyboard navigation handlers
    container.addEventListener("keydown", (e) => {
      const isOpen = dropdown.classList.contains("show");
      
      if (e.key === "Escape") {
        closeDropdown();
        trigger.focus();
        e.preventDefault();
      }

      if (!isOpen) {
        if (e.key === "Enter" || e.key === "ArrowDown" || e.key === "ArrowUp") {
          openDropdown();
          e.preventDefault();
        }
        return;
      }

      // Keyboard navigation while list is open
      if (e.key === "ArrowDown") {
        e.preventDefault();
        highlightedIndex = (highlightedIndex + 1) % visibleOptions.length;
        this.updateHighlightedOption(visibleOptions, highlightedIndex);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        highlightedIndex = (highlightedIndex - 1 + visibleOptions.length) % visibleOptions.length;
        this.updateHighlightedOption(visibleOptions, highlightedIndex);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (highlightedIndex > -1 && visibleOptions[highlightedIndex]) {
          visibleOptions[highlightedIndex].click();
        } else if (visibleOptions.length > 0) {
          visibleOptions[0].click(); // Select first item if none highlighted
        }
      }
    });

    // Close on click outside
    document.addEventListener("click", (e) => {
      if (!container.contains(e.target)) {
        closeDropdown();
      }
    });

    return {
      setValue: (code) => {
        selectedValue = code;
        const flag = CurrencyAPI.CURRENCY_DETAILS[code]?.flag || "un";
        trigger.innerHTML = `
          <img class="select-trigger-flag" src="https://flagcdn.com/w40/${flag}.png" alt="${code}">
          <span class="select-trigger-text">${code} - ${CurrencyAPI.CURRENCY_DETAILS[code]?.name || code}</span>
          <span class="select-trigger-arrow">▼</span>
        `;
      },
      getValue: () => selectedValue
    };
  }

  /**
   * Helper to update visual highlighting during keyboard navigation
   */
  updateHighlightedOption(options, index) {
    options.forEach(opt => opt.classList.remove("highlighted"));
    const activeOpt = options[index];
    if (activeOpt) {
      activeOpt.classList.add("highlighted");
      activeOpt.scrollIntoView({ block: "nearest" });
    }
  }

  /**
   * Setup UI action triggers
   */
  setupEventListeners() {
    // Theme toggle bind
    const themeBtn = document.getElementById("theme-toggle-trigger");
    if (themeBtn) {
      themeBtn.addEventListener("click", () => this.toggleTheme());
    }

    // Swapping trigger
    const swapBtn = document.getElementById("swap-currencies-btn");
    if (swapBtn) {
      swapBtn.addEventListener("click", () => {
        const fromVal = this.selectors.from.getValue();
        const toVal = this.selectors.to.getValue();
        
        this.selectors.from.setValue(toVal);
        this.selectors.to.setValue(fromVal);
        
        this.state.fromCurrency = toVal;
        this.state.toCurrency = fromVal;

        if (this.callbacks.onSwap) {
          this.callbacks.onSwap();
        }
      });
    }

    // Convert trigger button
    const convertBtn = document.getElementById("convert-btn-trigger");
    if (convertBtn) {
      convertBtn.addEventListener("click", () => {
        if (this.callbacks.onConvertSubmit) {
          this.callbacks.onConvertSubmit();
        }
      });
    }

    // CSV Export trigger
    const csvExportBtn = document.getElementById("csv-export-btn");
    if (csvExportBtn) {
      csvExportBtn.addEventListener("click", () => {
        if (this.callbacks.onExportCSV) {
          this.callbacks.onExportCSV();
        }
      });
    }

    // Clear history trigger
    const clearHistoryBtn = document.getElementById("clear-history-btn");
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to clear your local conversion log? This will reset all analytics charts.")) {
          if (this.callbacks.onClearHistory) {
            this.callbacks.onClearHistory();
          }
        }
      });
    }

    // Favorites pair trigger
    const favoriteBtn = document.getElementById("favorite-pair-trigger");
    if (favoriteBtn) {
      favoriteBtn.addEventListener("click", () => {
        if (this.callbacks.onFavoriteToggle) {
          this.callbacks.onFavoriteToggle();
        }
      });
    }
  }

  /**
   * Attaches ripples styling to interactive buttons
   */
  setupRipples() {
    document.addEventListener("click", (e) => {
      const button = e.target.closest("button, .nav-tab, .timeframe-btn");
      if (!button) return;

      button.classList.add("ripple");
      
      const circle = document.createElement("span");
      const diameter = Math.max(button.clientWidth, button.clientHeight);
      const radius = diameter / 2;

      const rect = button.getBoundingClientRect();
      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${e.clientX - rect.left - radius}px`;
      circle.style.top = `${e.clientY - rect.top - radius}px`;
      circle.classList.add("ripple-effect");

      const existingRipple = button.querySelector(".ripple-effect");
      if (existingRipple) {
        existingRipple.remove();
      }

      button.appendChild(circle);
      setTimeout(() => circle.remove(), 600);
    });
  }

  /**
   * Refreshes dashboard analytics cards using animation counters
   */
  renderAnalyticsDashboard(stats, prevStats) {
    this.animateValue("card-total-conversions", prevStats.totalConversions, stats.totalConversions, 800);
    
    const countSupported = document.getElementById("card-currencies-supported");
    if (countSupported) countSupported.textContent = stats.currenciesSupported;
    
    const activeCurrency = document.getElementById("card-most-active-currency");
    if (activeCurrency) activeCurrency.textContent = stats.mostActiveCurrency;

    const favoritePairCard = document.getElementById("card-favorite-pair");
    if (favoritePairCard) favoritePairCard.textContent = stats.favoritePair;

    this.animateValue("card-avg-amount", prevStats.averageAmount, stats.averageConversionAmountUsd, 800, (val) => {
      return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    });

    const accuracyCard = document.getElementById("card-accuracy");
    if (accuracyCard) accuracyCard.textContent = `${stats.accuracy}%`;

    const baseLabel = document.getElementById("comparison-base-label");
    if (baseLabel) baseLabel.textContent = this.state.fromCurrency;
  }

  /**
   * Helper function for counting animations on metrics
   */
  animateValue(elementId, start, end, duration, formatFn = (val) => Math.round(val)) {
    const obj = document.getElementById(elementId);
    if (!obj) return;
    
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const currentVal = progress * (end - start) + start;
      obj.innerHTML = formatFn(currentVal);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }

  /**
   * Renders the conversion rates info and last updated text
   */
  updateConversionDisplay(rate, fromCode, toCode) {
    const container = document.getElementById("exchange-rate-details");
    if (!container) return;

    const symbol = CurrencyAPI.CURRENCY_DETAILS[toCode]?.symbol || "";
    const dateStr = new Date().toLocaleString(undefined, {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    container.innerHTML = `
      <div style="font-size: 1.05rem; font-weight: 600; color: var(--text-primary);">
        1 ${fromCode} = ${symbol}${rate.toFixed(4)} ${toCode}
      </div>
      <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
        Last Updated: ${dateStr}
      </div>
    `;
  }

  /**
   * Dynamic volatility pill rendering under converter panel
   */
  updateVolatilityDisplay(fromCode, toCode) {
    const container = document.getElementById("converter-volatility-box");
    if (!container) return;

    const metrics = CurrencyAPI.getVolatilityMetrics(fromCode, toCode);
    let emoji = "🟢";
    if (metrics.volatility === "Medium") emoji = "🟡";
    if (metrics.volatility === "High") emoji = "🔴";

    container.innerHTML = `
      <div class="vol-card ${metrics.colorClass}">
        <div>
          <span class="input-label" style="display:block">Volatility Risk Rating</span>
          <strong style="font-size:1.05rem; display:flex; align-items:center; gap: 8px;">
            ${emoji} ${fromCode}/${toCode}: ${metrics.volatility} Volatility
          </strong>
        </div>
        <div class="vol-risk-pill">Risk Score: ${metrics.riskScore}/10</div>
      </div>
    `;
  }

  /**
   * Renders the 24H Movers list cards (Gainers/Losers)
   */
  renderMovers(movers) {
    const renderList = (containerId, list, isGainer) => {
      const container = document.getElementById(containerId);
      if (!container) return;

      container.innerHTML = "";
      list.forEach(item => {
        const sign = isGainer ? "+" : "";
        const colorClass = isGainer ? "trend-up" : "trend-down";
        const icon = isGainer ? "▲" : "▼";
        
        const row = document.createElement("div");
        row.className = "mover-row";
        row.innerHTML = `
          <div class="currency-info-col">
            <img class="currency-flag" src="https://flagcdn.com/w40/${item.flag}.png" style="position:static; transform:none;" alt="${item.code}">
            <div>
              <span class="mover-code">${item.code}</span>
              <span class="mover-name" style="display:block;">${item.name}</span>
            </div>
          </div>
          <div class="mover-values">
            <span class="mover-rate">${item.rate.toFixed(4)}</span>
            <span class="mover-percentage ${colorClass}">${icon} ${sign}${item.change.toFixed(2)}%</span>
          </div>
        `;
        container.appendChild(row);
      });
    };

    renderList("top-gainers-list", movers.gainers, true);
    renderList("top-losers-list", movers.losers, false);
  }

  /**
   * Renders the comparison data table
   */
  renderComparisonTable(baseCode, rates) {
    const tbody = document.getElementById("comparison-table-body");
    if (!tbody) return;

    tbody.innerHTML = "";
    
    // Currencies to compare against the base
    const compareList = ["EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "INR", "SGD", "ZAR", "AED"];
    
    compareList.forEach(code => {
      if (code === baseCode) return; // Skip comparing base with itself

      const rateBase = rates[baseCode] || 1;
      const rateTarget = rates[code] || 1;
      const currentRate = rateTarget / rateBase;

      // Extract 24H and 7D trends
      const trend24h = CurrencyAPI.generateHistoricalRates(baseCode, code, "24H", currentRate);
      const trend7d = CurrencyAPI.generateHistoricalRates(baseCode, code, "7D", currentRate);

      const sign24 = trend24h.percentChange >= 0 ? "+" : "";
      const color24 = trend24h.percentChange >= 0 ? "var(--color-success)" : "var(--color-danger)";
      
      const sign7 = trend7d.percentChange >= 0 ? "+" : "";
      const color7 = trend7d.percentChange >= 0 ? "var(--color-success)" : "var(--color-danger)";

      const flag = CurrencyAPI.CURRENCY_DETAILS[code]?.flag || "un";
      const symbol = CurrencyAPI.CURRENCY_DETAILS[code]?.symbol || "";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <div class="table-currency-cell">
            <img class="currency-flag" src="https://flagcdn.com/w40/${flag}.png" style="position:static; transform:none;" alt="${code}">
            <span>${code} <span style="font-weight:400; font-size:0.8rem; color:var(--text-secondary)">(${CurrencyAPI.CURRENCY_DETAILS[code]?.name})</span></span>
          </div>
        </td>
        <td style="font-family:var(--font-display); font-weight:700;">${symbol}${currentRate.toFixed(4)}</td>
        <td style="color:${color24}; font-weight:600;">${sign24}${trend24h.percentChange.toFixed(2)}%</td>
        <td style="color:${color7}; font-weight:600;">${sign7}${trend7d.percentChange.toFixed(2)}%</td>
      `;
      tbody.appendChild(tr);
    });
  }

  /**
   * Renders the conversion transactions logs list table
   */
  renderConversionHistory(history) {
    const list = document.getElementById("conversion-history-list");
    if (!list) return;

    list.innerHTML = "";
    
    if (history.length === 0) {
      list.innerHTML = `
        <div class="history-empty">
          No conversions logged yet. Set an amount and click "Convert" to create records.
        </div>
      `;
      return;
    }

    history.forEach(entry => {
      const formattedDate = new Date(entry.timestamp).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      
      const fromSymbol = CurrencyAPI.CURRENCY_DETAILS[entry.from]?.symbol || "";
      const toSymbol = CurrencyAPI.CURRENCY_DETAILS[entry.to]?.symbol || "";
      
      const div = document.createElement("div");
      div.className = "history-item";
      div.innerHTML = `
        <div class="history-meta">
          <div style="background:var(--border-color); padding: 8px 12px; border-radius:8px; text-align:center;">
            <span class="history-pair">${entry.from}/${entry.to}</span>
            <span class="history-timestamp" style="display:block; font-size:0.7rem; margin-top:2px;">${formattedDate}</span>
          </div>
        </div>
        <div class="history-values">
          <span class="history-calc">${fromSymbol}${entry.amount.toFixed(2)} ➔ ${toSymbol}${entry.result.toFixed(2)}</span>
          <div class="history-rate-factor">Rate: ${entry.rate.toFixed(4)}</div>
        </div>
      `;
      list.appendChild(div);
    });
  }

  /**
   * Updates Trend analysis tables under historical chart panel
   */
  renderTrendAnalysisPanel(trends, fromCode, toCode) {
    const panel = document.getElementById("trend-analysis-panel");
    if (!panel) return;

    const createCell = (val) => {
      const sign = val >= 0 ? "+" : "";
      const color = val >= 0 ? "var(--color-success)" : "var(--color-danger)";
      return `<span style="color:${color}; font-weight:700;">${sign}${val.toFixed(2)}%</span>`;
    };

    panel.innerHTML = `
      <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top:12px; text-align:center;">
        <div style="background:rgba(255,255,255,0.02); border: 1px solid var(--border-color); padding: 12px; border-radius:8px;">
          <span class="input-label" style="font-size:0.7rem;">24H Change</span>
          <div style="font-size:1.1rem; margin-top:4px;">${createCell(trends.changes["24H"])}</div>
        </div>
        <div style="background:rgba(255,255,255,0.02); border: 1px solid var(--border-color); padding: 12px; border-radius:8px;">
          <span class="input-label" style="font-size:0.7rem;">7D Change</span>
          <div style="font-size:1.1rem; margin-top:4px;">${createCell(trends.changes["7D"])}</div>
        </div>
        <div style="background:rgba(255,255,255,0.02); border: 1px solid var(--border-color); padding: 12px; border-radius:8px;">
          <span class="input-label" style="font-size:0.7rem;">30D Change</span>
          <div style="font-size:1.1rem; margin-top:4px;">${createCell(trends.changes["30D"])}</div>
        </div>
        <div style="background:rgba(255,255,255,0.02); border: 1px solid var(--border-color); padding: 12px; border-radius:8px;">
          <span class="input-label" style="font-size:0.7rem;">1Y Change</span>
          <div style="font-size:1.1rem; margin-top:4px;">${createCell(trends.changes["1Y"])}</div>
        </div>
      </div>
    `;

    // Adjust favorite button visual active states
    const favoriteBtn = document.getElementById("favorite-pair-trigger");
    if (favoriteBtn) {
      const pair = `${fromCode}/${toCode}`;
      const favorites = StorageManager.getFavoritePairs();
      
      if (favorites.includes(pair)) {
        favoriteBtn.classList.add("active");
        favoriteBtn.querySelector("span").textContent = "Favorited";
      } else {
        favoriteBtn.classList.remove("active");
        favoriteBtn.querySelector("span").textContent = "Add to Favorites";
      }
    }
  }

  /**
   * Renders the dynamic market overview (Strongest/Weakest) in Analytics Insights
   */
  renderMarketOverview(overview) {
    const strongestEl = document.getElementById("market-strongest");
    const weakestEl = document.getElementById("market-weakest");
    const tradedEl = document.getElementById("market-traded");
    const volatileEl = document.getElementById("market-volatile");

    if (strongestEl) strongestEl.textContent = overview.strongest;
    if (weakestEl) weakestEl.textContent = overview.weakest;
    if (tradedEl) tradedEl.textContent = overview.mostTraded;
    if (volatileEl) volatileEl.textContent = overview.mostVolatile;
  }

  /**
   * Displays temporary premium visual toast messages
   */
  showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.style.position = "fixed";
    toast.style.bottom = "24px";
    toast.style.right = "24px";
    toast.style.background = "var(--card-bg-solid)";
    toast.style.color = "var(--text-primary)";
    
    // Choose border colors depending on toast action types
    if (type === "error") {
      toast.style.border = "1px solid var(--color-danger)";
    } else if (type === "warning") {
      toast.style.border = "1px solid var(--color-warning)";
    } else {
      toast.style.border = "1px solid var(--color-success)";
    }

    toast.style.boxShadow = "var(--shadow-lg)";
    toast.style.borderRadius = "8px";
    toast.style.padding = "16px 20px";
    toast.style.zIndex = "999";
    toast.style.fontWeight = "600";
    toast.style.fontSize = "0.9rem";
    toast.style.display = "flex";
    toast.style.alignItems = "center";
    toast.style.gap = "10px";
    
    const icon = type === "success" ? "✔" : (type === "warning" ? "⚠" : "✖");
    const iconColor = type === "success" ? "var(--color-success)" : (type === "warning" ? "var(--color-warning)" : "var(--color-danger)");

    toast.innerHTML = `
      <span style="color:${iconColor};">${icon}</span>
      <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    toast.classList.add("toast-in");
    
    // Anim out & delete
    setTimeout(() => {
      toast.classList.replace("toast-in", "toast-out");
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }
}
