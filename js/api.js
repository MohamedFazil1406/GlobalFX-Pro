/**
 * GlobalFX Pro - API & Data Engine
 * Class-based design to fetch live rates and generate high-fidelity simulated historical trends.
 */

class CurrencyAPI {
  // Supported currency data with country mappings for flags and full names
  static CURRENCY_DETAILS = {
    USD: { name: "US Dollar", flag: "us", symbol: "$", country: "United States" },
    EUR: { name: "Euro", flag: "eu", symbol: "€", country: "European Union" },
    GBP: { name: "British Pound", flag: "gb", symbol: "£", country: "United Kingdom" },
    JPY: { name: "Japanese Yen", flag: "jp", symbol: "¥", country: "Japan" },
    AUD: { name: "Australian Dollar", flag: "au", symbol: "A$", country: "Australia" },
    CAD: { name: "Canadian Dollar", flag: "ca", symbol: "C$", country: "Canada" },
    CHF: { name: "Swiss Franc", flag: "ch", symbol: "CHF", country: "Switzerland" },
    CNY: { name: "Chinese Yuan", flag: "cn", symbol: "¥", country: "China" },
    HKD: { name: "Hong Kong Dollar", flag: "hk", symbol: "HK$", country: "Hong Kong" },
    NZD: { name: "New Zealand Dollar", flag: "nz", symbol: "NZ$", country: "New Zealand" },
    SEK: { name: "Swedish Krona", flag: "se", symbol: "kr", country: "Sweden" },
    KRW: { name: "South Korean Won", flag: "kr", symbol: "₩", country: "South Korea" },
    SGD: { name: "Singapore Dollar", flag: "sg", symbol: "S$", country: "Singapore" },
    NOK: { name: "Norwegian Krone", flag: "no", symbol: "kr", country: "Norway" },
    MXN: { name: "Mexican Peso", flag: "mx", symbol: "$", country: "Mexico" },
    INR: { name: "Indian Rupee", flag: "in", symbol: "₹", country: "India" },
    RUB: { name: "Russian Ruble", flag: "ru", symbol: "₽", country: "Russia" },
    ZAR: { name: "South African Rand", flag: "za", symbol: "R", country: "South Africa" },
    TRY: { name: "Turkish Lira", flag: "tr", symbol: "₺", country: "Turkey" },
    BRL: { name: "Brazilian Real", flag: "br", symbol: "R$", country: "Brazil" },
    TWD: { name: "New Taiwan Dollar", flag: "tw", symbol: "NT$", country: "Taiwan" },
    DKK: { name: "Danish Krone", flag: "dk", symbol: "kr", country: "Denmark" },
    PLN: { name: "Polish Zloty", flag: "pl", symbol: "zł", country: "Poland" },
    THB: { name: "Thai Baht", flag: "th", symbol: "฿", country: "Thailand" },
    IDR: { name: "Indonesian Rupiah", flag: "id", symbol: "Rp", country: "Indonesia" },
    HUF: { name: "Hungarian Forint", flag: "hu", symbol: "Ft", country: "Hungary" },
    CZK: { name: "Czech Koruna", flag: "cz", symbol: "Kč", country: "Czech Republic" },
    ILS: { name: "Israeli New Shekel", flag: "il", symbol: "₪", country: "Israel" },
    CLP: { name: "Chilean Peso", flag: "cl", symbol: "$", country: "Chile" },
    PHP: { name: "Philippine Peso", flag: "ph", symbol: "₱", country: "Philippines" },
    AED: { name: "UAE Dirham", flag: "ae", symbol: "د.إ", country: "United Arab Emirates" },
    COP: { name: "Colombian Peso", flag: "co", symbol: "$", country: "Colombia" },
    SAR: { name: "Saudi Riyal", flag: "sa", symbol: "ر.س", country: "Saudi Arabia" },
    MYR: { name: "Malaysian Ringgit", flag: "my", symbol: "RM", country: "Malaysia" },
    RON: { name: "Romanian Leu", flag: "ro", symbol: "lei", country: "Romania" },
    ARS: { name: "Argentine Peso", flag: "ar", symbol: "$", country: "Argentina" },
    EGP: { name: "Egyptian Pound", flag: "eg", symbol: "E£", country: "Egypt" },
    VND: { name: "Vietnamese Dong", flag: "vn", symbol: "₫", country: "Vietnam" },
    UAH: { name: "Ukrainian Hryvnia", flag: "ua", symbol: "₴", country: "Ukraine" },
    KWD: { name: "Kuwaiti Dinar", flag: "kw", symbol: "د.ك", country: "Kuwait" },
    QAR: { name: "Qatari Riyal", flag: "qa", symbol: "ر.ق", country: "Qatar" },
  };

  // Fallback rates if the API request fails (relative to USD)
  static FALLBACK_RATES = {
    USD: 1.0,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 156.4,
    AUD: 1.51,
    CAD: 1.37,
    CHF: 0.90,
    CNY: 7.24,
    HKD: 7.81,
    NZD: 1.63,
    SEK: 10.51,
    KRW: 1375.0,
    SGD: 1.35,
    NOK: 10.58,
    MXN: 17.70,
    INR: 83.45,
    RUB: 89.20,
    ZAR: 18.65,
    TRY: 32.50,
    BRL: 5.25,
    ARS: 900.0,
    AED: 3.67,
    SAR: 3.75,
    DKK: 6.87,
    PLN: 3.96,
    THB: 36.70,
    IDR: 16250.0,
    HUF: 362.5,
    CZK: 22.85,
    ILS: 3.72,
    CLP: 920.0,
    PHP: 58.60,
    COP: 3880.0,
    MYR: 4.70,
    RON: 4.58,
    EGP: 47.30,
    VND: 25450.0,
    UAH: 40.50,
    KWD: 0.31,
    QAR: 3.64
  };

  static API_URL = "https://open.er-api.com/v6/latest/USD";
  
  static ratesCache = {
    data: null,
    timestamp: 0,
  };

  /**
   * Fetch real-time exchange rates (base USD) with a 5-minute cache
   */
  static async fetchExchangeRates() {
    const now = Date.now();
    // Cache for 5 minutes
    if (this.ratesCache.data && now - this.ratesCache.timestamp < 300000) {
      return this.ratesCache.data;
    }

    try {
      const response = await fetch(this.API_URL);
      if (!response.ok) throw new Error("API response error");
      const data = await response.json();
      if (data && data.rates) {
        this.ratesCache.data = data.rates;
        this.ratesCache.timestamp = now;
        return data.rates;
      }
    } catch (error) {
      console.warn("Using offline fallback exchange rates:", error);
    }

    // Fallback
    this.ratesCache.data = { ...this.FALLBACK_RATES };
    this.ratesCache.timestamp = now;
    return this.ratesCache.data;
  }

  /**
   * Seeded pseudo-random number generator
   * Returns a number between 0 and 1 deterministically based on seed
   */
  static seedRandom(seedStr) {
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    return function () {
      const x = Math.sin(hash++) * 10000;
      return x - Math.floor(x);
    };
  }

  /**
   * Volatility classifier based on currency codes
   * Returns volatility classification & risk score
   */
  static getVolatilityMetrics(base, target) {
    const getVolScore = (code) => {
      // High volatility currencies
      if (["TRY", "ARS", "RUB", "BRL", "EGP", "VND", "UAH"].includes(code)) return 8;
      // Medium volatility
      if (["MXN", "INR", "ZAR", "IDR", "PHP", "THB", "COP", "KRW", "CLP"].includes(code)) return 5;
      // Low volatility / majors
      return 2;
    };

    const score1 = getVolScore(base);
    const score2 = getVolScore(target);
    const maxScore = Math.max(score1, score2);

    let volatility = "Low";
    let color = "var(--color-success)";
    let colorClass = "vol-low";
    if (maxScore >= 7) {
      volatility = "High";
      color = "var(--color-danger)";
      colorClass = "vol-high";
    } else if (maxScore >= 4) {
      volatility = "Medium";
      color = "var(--color-warning)";
      colorClass = "vol-medium";
    }

    return {
      volatility,
      riskScore: maxScore,
      color,
      colorClass
    };
  }

  /**
   * Generates high-fidelity historical data deterministically
   * Base rates are live rates. Historical trend is built backward.
   */
  static generateHistoricalRates(base, target, timeframe, currentRate) {
    const rand = this.seedRandom(`${base}-${target}-${timeframe}`);
    
    let dataPointsCount = 30;
    let intervalHours = 24;
    
    switch (timeframe) {
      case "24H":
        dataPointsCount = 24; // Hourly
        intervalHours = 1;
        break;
      case "7D":
        dataPointsCount = 7;
        intervalHours = 24;
        break;
      case "30D":
        dataPointsCount = 30;
        intervalHours = 24;
        break;
      case "90D":
        dataPointsCount = 90;
        intervalHours = 24;
        break;
      case "1Y":
        dataPointsCount = 52; // Weekly
        intervalHours = 24 * 7;
        break;
    }

    const volMetrics = this.getVolatilityMetrics(base, target);
    // Volatility scale factor based on risk score (2/10 = 0.001, 5/10 = 0.003, 8/10 = 0.008)
    const volFactor = (volMetrics.riskScore / 10) * 0.01;

    // Let's create an underlying trend (e.g. general upward or downward drift)
    const trendDrift = (rand() - 0.5) * 0.02; // Up to 2% drift over the entire series

    const labels = [];
    const rates = [];
    
    const now = new Date();
    let tempRate = currentRate;
    
    // Create rates backwards, then we will reverse them
    for (let i = 0; i < dataPointsCount; i++) {
      const dataDate = new Date(now.getTime() - i * intervalHours * 60 * 60 * 1000);
      
      // Format labels depending on timeframe
      let label = "";
      if (timeframe === "24H") {
        label = dataDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (timeframe === "7D" || timeframe === "30D") {
        label = dataDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
      } else if (timeframe === "90D" || timeframe === "1Y") {
        label = dataDate.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
      }
      
      labels.push(label);
      rates.push(tempRate);
      
      // Calculate the step backwards
      // A random walk with a slight drift backward
      const walkStep = (rand() - 0.5 + trendDrift / dataPointsCount) * volFactor;
      tempRate = tempRate * (1 - walkStep);
    }

    // Reverse lists to flow left-to-right (past to present)
    labels.reverse();
    rates.reverse();

    // Calculate rate changes relative to history
    const startRate = rates[0];
    const endRate = rates[rates.length - 1];
    const percentChange = ((endRate - startRate) / startRate) * 100;

    return {
      labels,
      rates,
      percentChange,
      startRate,
      endRate,
      volatility: volMetrics
    };
  }

  /**
   * Calculates trend changes for a currency pair across all main timeframes
   */
  static getExchangeRateTrends(base, target, currentRate) {
    return {
      currentRate,
      changes: {
        "24H": this.generateHistoricalRates(base, target, "24H", currentRate).percentChange,
        "7D": this.generateHistoricalRates(base, target, "7D", currentRate).percentChange,
        "30D": this.generateHistoricalRates(base, target, "30D", currentRate).percentChange,
        "1Y": this.generateHistoricalRates(base, target, "1Y", currentRate).percentChange,
      }
    };
  }

  /**
   * Dynamically computes top movers based on rate changes relative to USD
   */
  static getTopMovers(rates) {
    const list = [];
    
    // Calculate 24h change for all currencies relative to USD
    for (const currency of Object.keys(rates)) {
      if (currency === "USD") continue;
      const rate = rates[currency];
      const trend = this.generateHistoricalRates("USD", currency, "24H", rate);
      list.push({
        code: currency,
        name: this.CURRENCY_DETAILS[currency]?.name || currency,
        flag: this.CURRENCY_DETAILS[currency]?.flag || "un",
        change: trend.percentChange,
        rate: rate
      });
    }

    // Sort by change (descending for gainers, ascending for losers)
    list.sort((a, b) => b.change - a.change);

    // Top 3 Gainers, Top 3 Losers
    const gainers = list.slice(0, 3);
    const losers = list.slice(-3).reverse();

    return {
      gainers,
      losers
    };
  }
}
