/**
 * GlobalFX Pro - API & Data Engine
 * Refactored to use real historical exchange rates from Frankfurter API.
 *
 * ─── CHANGES SUMMARY ────────────────────────────────────────────────────────
 *
 * DELETED FUNCTIONS (simulated / fake data):
 *   ✗  seedRandom()               — seeded PRNG, no longer needed
 *   ✗  generateHistoricalRates()  — synthetic random-walk history, replaced
 *   ✗  getVolatilityMetrics()     — relied on fake riskScore from vol-classes,
 *                                   volatility is now derived from real σ (std-dev)
 *
 * REPLACED / REFACTORED FUNCTIONS:
 *   ↻  getExchangeRateTrends()    — now calls fetchHistoricalRates() internally
 *   ↻  getTopMovers()             — now uses real 24 H historical data
 *
 * NEW FUNCTIONS:
 *   ✦  getDateRangeForTimeframe() — returns { from, to } ISO strings for each TF
 *   ✦  fetchHistoricalRates()     — hits Frankfurter API, normalises to chart data
 *   ✦  cacheHistoricalData()      — write-through helpers for the historical cache
 *   ✦  getCachedHistoricalData()  — read helper with TTL enforcement
 *   ✦  calculateTrendMetrics()    — derives percentChange, startRate, endRate,
 *                                   volatility (real σ) from a rates array
 *
 * UNCHANGED:
 *   ✔  CURRENCY_DETAILS           — all metadata intact
 *   ✔  FALLBACK_RATES             — intact
 *   ✔  API_URL / ratesCache       — intact
 *   ✔  fetchExchangeRates()       — intact, live rates still from open.er-api.com
 *   ✔  Class name CurrencyAPI     — intact
 *
 * ─── FRANKFURTER API NOTES ──────────────────────────────────────────────────
 *   Base URL : https://api.frankfurter.app
 *   Range    : /YYYY-MM-DD..YYYY-MM-DD?from=BASE&to=TARGET
 *   Single   : /YYYY-MM-DD?from=BASE&to=TARGET
 *   Latest   : /latest?from=BASE&to=TARGET
 *   • Free, no key required, CORS-enabled.
 *   • Does NOT provide intraday (hourly) data.  For the 24 H timeframe we use
 *     today's and yesterday's single-day quotes and interpolate 24 synthetic
 *     hourly labels anchored to two REAL data points (open & close).
 *   • Returns business-day data only – weekends are not included.
 * ────────────────────────────────────────────────────────────────────────────
 */

class CurrencyAPI {

  // ── Currency metadata ──────────────────────────────────────────────────────

  static CURRENCY_DETAILS = {
    USD: { name: "US Dollar",            flag: "us", symbol: "$",    country: "United States"       },
    EUR: { name: "Euro",                 flag: "eu", symbol: "€",    country: "European Union"       },
    GBP: { name: "British Pound",        flag: "gb", symbol: "£",    country: "United Kingdom"       },
    JPY: { name: "Japanese Yen",         flag: "jp", symbol: "¥",    country: "Japan"                },
    AUD: { name: "Australian Dollar",    flag: "au", symbol: "A$",   country: "Australia"            },
    CAD: { name: "Canadian Dollar",      flag: "ca", symbol: "C$",   country: "Canada"               },
    CHF: { name: "Swiss Franc",          flag: "ch", symbol: "CHF",  country: "Switzerland"          },
    CNY: { name: "Chinese Yuan",         flag: "cn", symbol: "¥",    country: "China"                },
    HKD: { name: "Hong Kong Dollar",     flag: "hk", symbol: "HK$",  country: "Hong Kong"            },
    NZD: { name: "New Zealand Dollar",   flag: "nz", symbol: "NZ$",  country: "New Zealand"          },
    SEK: { name: "Swedish Krona",        flag: "se", symbol: "kr",   country: "Sweden"               },
    KRW: { name: "South Korean Won",     flag: "kr", symbol: "₩",    country: "South Korea"          },
    SGD: { name: "Singapore Dollar",     flag: "sg", symbol: "S$",   country: "Singapore"            },
    NOK: { name: "Norwegian Krone",      flag: "no", symbol: "kr",   country: "Norway"               },
    MXN: { name: "Mexican Peso",         flag: "mx", symbol: "$",    country: "Mexico"               },
    INR: { name: "Indian Rupee",         flag: "in", symbol: "₹",    country: "India"                },
    RUB: { name: "Russian Ruble",        flag: "ru", symbol: "₽",    country: "Russia"               },
    ZAR: { name: "South African Rand",   flag: "za", symbol: "R",    country: "South Africa"         },
    TRY: { name: "Turkish Lira",         flag: "tr", symbol: "₺",    country: "Turkey"               },
    BRL: { name: "Brazilian Real",       flag: "br", symbol: "R$",   country: "Brazil"               },
    TWD: { name: "New Taiwan Dollar",    flag: "tw", symbol: "NT$",  country: "Taiwan"               },
    DKK: { name: "Danish Krone",         flag: "dk", symbol: "kr",   country: "Denmark"              },
    PLN: { name: "Polish Zloty",         flag: "pl", symbol: "zł",   country: "Poland"               },
    THB: { name: "Thai Baht",            flag: "th", symbol: "฿",    country: "Thailand"             },
    IDR: { name: "Indonesian Rupiah",    flag: "id", symbol: "Rp",   country: "Indonesia"            },
    HUF: { name: "Hungarian Forint",     flag: "hu", symbol: "Ft",   country: "Hungary"              },
    CZK: { name: "Czech Koruna",         flag: "cz", symbol: "Kč",   country: "Czech Republic"       },
    ILS: { name: "Israeli New Shekel",   flag: "il", symbol: "₪",    country: "Israel"               },
    CLP: { name: "Chilean Peso",         flag: "cl", symbol: "$",    country: "Chile"                },
    PHP: { name: "Philippine Peso",      flag: "ph", symbol: "₱",    country: "Philippines"          },
    AED: { name: "UAE Dirham",           flag: "ae", symbol: "د.إ",  country: "United Arab Emirates" },
    COP: { name: "Colombian Peso",       flag: "co", symbol: "$",    country: "Colombia"             },
    SAR: { name: "Saudi Riyal",          flag: "sa", symbol: "ر.س",  country: "Saudi Arabia"         },
    MYR: { name: "Malaysian Ringgit",    flag: "my", symbol: "RM",   country: "Malaysia"             },
    RON: { name: "Romanian Leu",         flag: "ro", symbol: "lei",  country: "Romania"              },
    ARS: { name: "Argentine Peso",       flag: "ar", symbol: "$",    country: "Argentina"            },
    EGP: { name: "Egyptian Pound",       flag: "eg", symbol: "E£",   country: "Egypt"                },
    VND: { name: "Vietnamese Dong",      flag: "vn", symbol: "₫",    country: "Vietnam"              },
    UAH: { name: "Ukrainian Hryvnia",    flag: "ua", symbol: "₴",    country: "Ukraine"              },
    KWD: { name: "Kuwaiti Dinar",        flag: "kw", symbol: "د.ك",  country: "Kuwait"               },
    QAR: { name: "Qatari Riyal",         flag: "qa", symbol: "ر.ق",  country: "Qatar"                },
  };

  // ── Fallback rates (USD base) ──────────────────────────────────────────────

  static FALLBACK_RATES = {
    USD: 1.0,    EUR: 0.92,   GBP: 0.79,   JPY: 156.4,  AUD: 1.51,
    CAD: 1.37,   CHF: 0.90,   CNY: 7.24,   HKD: 7.81,   NZD: 1.63,
    SEK: 10.51,  KRW: 1375.0, SGD: 1.35,   NOK: 10.58,  MXN: 17.70,
    INR: 83.45,  RUB: 89.20,  ZAR: 18.65,  TRY: 32.50,  BRL: 5.25,
    ARS: 900.0,  AED: 3.67,   SAR: 3.75,   DKK: 6.87,   PLN: 3.96,
    THB: 36.70,  IDR: 16250.0,HUF: 362.5,  CZK: 22.85,  ILS: 3.72,
    CLP: 920.0,  PHP: 58.60,  COP: 3880.0, MYR: 4.70,   RON: 4.58,
    EGP: 47.30,  VND: 25450.0,UAH: 40.50,  KWD: 0.31,   QAR: 3.64,
  };

  // ── Endpoints ──────────────────────────────────────────────────────────────

  /** Live rates endpoint (open.er-api.com) */
  static API_URL = "https://open.er-api.com/v6/latest/USD";

  /** Frankfurter historical endpoint */
  static FRANKFURTER_URL = "https://api.frankfurter.app";

  // ── Caches ─────────────────────────────────────────────────────────────────

  /** Live rates cache – 5 minute TTL */
  static ratesCache = { data: null, timestamp: 0 };

  /**
   * Historical data cache – keyed by `"BASE-TARGET-TIMEFRAME"`.
   * Structure: { [key]: { data: ChartPayload, timestamp: number } }
   *
   * TTL policy:
   *   24H  →  15 minutes  (rates shift intraday)
   *   7D   →  60 minutes
   *   30D  →  6  hours
   *   90D  →  12 hours
   *   1Y   →  24 hours
   */
  static historicalCache = {};

  static HISTORICAL_TTL_MS = {
    "24H":  15  * 60  * 1000,
    "7D":   60  * 60  * 1000,
    "30D":  6   * 3600 * 1000,
    "90D":  12  * 3600 * 1000,
    "1Y":   24  * 3600 * 1000,
  };

  // ══════════════════════════════════════════════════════════════════════════
  // LIVE RATES  (unchanged)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Fetch real-time exchange rates (base USD) with a 5-minute cache.
   * @returns {Promise<Object>} Map of currency codes → rate vs USD
   */
  static async fetchExchangeRates() {
    const now = Date.now();
    if (this.ratesCache.data && now - this.ratesCache.timestamp < 300_000) {
      return this.ratesCache.data;
    }

    try {
      const response = await fetch(this.API_URL);
      if (!response.ok) throw new Error(`Live-rate API error: ${response.status}`);
      const data = await response.json();
      if (data?.rates) {
        this.ratesCache.data = data.rates;
        this.ratesCache.timestamp = now;
        return data.rates;
      }
      throw new Error("Malformed response from live-rate API");
    } catch (err) {
      console.warn("[CurrencyAPI] fetchExchangeRates – falling back to static rates:", err.message);
    }

    this.ratesCache.data      = { ...this.FALLBACK_RATES };
    this.ratesCache.timestamp = now;
    return this.ratesCache.data;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HISTORICAL CACHE HELPERS  (new)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Write chart payload to the historical cache.
   * @param {string}  base
   * @param {string}  target
   * @param {string}  timeframe  — "24H" | "7D" | "30D" | "90D" | "1Y"
   * @param {Object}  payload    — chart-ready data
   */
  static cacheHistoricalData(base, target, timeframe, payload) {
    const key = `${base}-${target}-${timeframe}`;
    this.historicalCache[key] = { data: payload, timestamp: Date.now() };
  }

  /**
   * Read chart payload from cache if within TTL.
   * @param {string}  base
   * @param {string}  target
   * @param {string}  timeframe
   * @returns {Object|null}  Cached payload or null if stale / absent
   */
  static getCachedHistoricalData(base, target, timeframe) {
    const key   = `${base}-${target}-${timeframe}`;
    const entry = this.historicalCache[key];
    if (!entry) return null;

    const ttl = this.HISTORICAL_TTL_MS[timeframe] ?? 3_600_000;
    if (Date.now() - entry.timestamp > ttl) {
      delete this.historicalCache[key]; // evict stale
      return null;
    }
    return entry.data;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DATE RANGE HELPER  (new)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Returns ISO date strings { from, to } for each supported timeframe.
   * "to" is always today.  Frankfurter excludes future dates.
   *
   * @param {string} timeframe  — "24H" | "7D" | "30D" | "90D" | "1Y"
   * @returns {{ from: string, to: string }}
   */
  static getDateRangeForTimeframe(timeframe) {
    const today  = new Date();
    const toStr  = this._isoDate(today);

    const OFFSET_DAYS = { "24H": 2, "7D": 7, "30D": 30, "90D": 90, "1Y": 365 };
    const days = OFFSET_DAYS[timeframe] ?? 30;

    const from  = new Date(today);
    from.setDate(from.getDate() - days);

    return { from: this._isoDate(from), to: toStr };
  }

  /** @private  Format Date → "YYYY-MM-DD" */
  static _isoDate(date) {
    return date.toISOString().slice(0, 10);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TREND METRICS  (new)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Derives chart-ready trend metrics from a raw rates array.
   *
   * Replaces all fake volatility logic.  Volatility is now the real
   * annualised coefficient of variation (σ / μ) of the rates series.
   *
   * @param {number[]} rates   — ordered array of exchange rates
   * @returns {{
   *   percentChange : number,
   *   startRate     : number,
   *   endRate       : number,
   *   volatility    : { level: string, annualisedCV: number, colorClass: string, color: string }
   * }}
   */
  static calculateTrendMetrics(rates) {
    if (!rates.length) {
      return { percentChange: 0, startRate: 0, endRate: 0,
               volatility: { level: "Unknown", annualisedCV: 0,
                             colorClass: "vol-unknown", color: "var(--color-muted)" } };
    }

    const startRate     = rates[0];
    const endRate       = rates[rates.length - 1];
    const percentChange = ((endRate - startRate) / startRate) * 100;

    // Real volatility: std-dev of daily log-returns → annualised
    let annualisedCV = 0;
    if (rates.length > 1) {
      const logReturns = [];
      for (let i = 1; i < rates.length; i++) {
        logReturns.push(Math.log(rates[i] / rates[i - 1]));
      }
      const mean  = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
      const variance = logReturns.reduce((a, b) => a + (b - mean) ** 2, 0) / logReturns.length;
      const dailySD   = Math.sqrt(variance);
      annualisedCV    = dailySD * Math.sqrt(252) * 100; // annualised %
    }

    let level      = "Low";
    let colorClass = "vol-low";
    let color      = "var(--color-success)";
    if (annualisedCV > 15) {
      level = "High";  colorClass = "vol-high";   color = "var(--color-danger)";
    } else if (annualisedCV > 6) {
      level = "Medium"; colorClass = "vol-medium"; color = "var(--color-warning)";
    }

    return { percentChange, startRate, endRate,
             volatility: { level, annualisedCV, colorClass, color } };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HISTORICAL RATES FETCHER  (new – replaces generateHistoricalRates)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Fetch real historical exchange rates from Frankfurter API and return
   * chart-ready data.  Results are cached per timeframe.
   *
   * For the 24H timeframe Frankfurter only provides end-of-day data, so we
   * fetch 2 days (yesterday + today) and interpolate 24 evenly-spaced hourly
   * labels between those two anchor points – this gives the chart meaningful
   * movement while staying anchored to real market closes.
   *
   * Compatible return shape (same as the old generateHistoricalRates):
   * {
   *   labels       : string[],
   *   rates        : number[],
   *   percentChange: number,
   *   startRate    : number,
   *   endRate      : number,
   *   volatility   : { level, annualisedCV, colorClass, color }
   * }
   *
   * @param {string} base        — e.g. "USD"
   * @param {string} target      — e.g. "EUR"
   * @param {string} timeframe   — "24H" | "7D" | "30D" | "90D" | "1Y"
   * @param {number} currentRate — live spot rate (used as fallback anchor)
   * @returns {Promise<Object>}
   */
  static async fetchHistoricalRates(base, target, timeframe, currentRate) {

    // 1. Cache hit?
    const cached = this.getCachedHistoricalData(base, target, timeframe);
    if (cached) return cached;

    // 2. Frankfurter does not support some exotic currencies.
    //    We fall back gracefully if the pair is unavailable.
    const { from, to } = this.getDateRangeForTimeframe(timeframe);

    // Frankfurter always quotes vs EUR internally; the API handles conversion.
    // Endpoint: /from..to?from=BASE&to=TARGET
    // If BASE === TARGET we return a flat line.
    if (base === target) {
      return this._flatLine(base, timeframe, currentRate);
    }

    try {
      const url = `${this.FRANKFURTER_URL}/${from}..${to}?from=${base}&to=${target}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Frankfurter API error ${response.status} for ${base}/${target}`);
      }

      const json = await response.json();

      // json.rates is an object keyed by "YYYY-MM-DD" → { TARGET: rate }
      if (!json.rates || typeof json.rates !== "object") {
        throw new Error("Unexpected Frankfurter response shape");
      }

      const sortedDates = Object.keys(json.rates).sort(); // chronological
      const rawRates    = sortedDates.map(d => json.rates[d][target]);

      // Validate — drop any undefined entries (can occur for illiquid pairs)
      const validPairs = sortedDates.reduce((acc, d, i) => {
        const r = rawRates[i];
        if (r != null && isFinite(r) && r > 0) acc.push({ date: d, rate: r });
        return acc;
      }, []);

      if (!validPairs.length) throw new Error("No valid rate data returned");

      if (timeframe === "24H") {
        // Interpolate 24 hourly points between yesterday close and today close
        return this._build24HPayload(validPairs, base, target, currentRate);
      }

      const labels = validPairs.map(p => this._formatDateLabel(p.date, timeframe));
      const rates  = validPairs.map(p => p.rate);
      const metrics = this.calculateTrendMetrics(rates);

      const payload = { labels, rates, ...metrics };
      this.cacheHistoricalData(base, target, timeframe, payload);
      return payload;

    } catch (err) {
      console.warn(`[CurrencyAPI] fetchHistoricalRates(${base}/${target}/${timeframe}) failed:`, err.message);
      return this._fallbackPayload(base, target, timeframe, currentRate);
    }
  }

  // ── 24H interpolation helper ───────────────────────────────────────────────

  /**
   * @private
   * Builds a 24-point (hourly) chart from up to 2 business-day closes.
   * If only one data point is available the chart is a flat line at that rate.
   */
  static _build24HPayload(validPairs, base, target, currentRate) {
    const HOURS = 24;
    const now   = new Date();

    // Use the last available close as "end", second-to-last (or same) as "start"
    const endRate   = validPairs[validPairs.length - 1]?.rate ?? currentRate;
    const startRate = validPairs.length > 1
      ? validPairs[validPairs.length - 2].rate
      : endRate;

    const labels = [];
    const rates  = [];

    for (let h = 0; h < HOURS; h++) {
      const t = new Date(now.getTime() - (HOURS - 1 - h) * 3_600_000);
      labels.push(t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));

      // Linear interpolation across the 24-hour window
      const rate = startRate + (endRate - startRate) * (h / (HOURS - 1));
      rates.push(rate);
    }

    const metrics = this.calculateTrendMetrics(rates);
    const payload = { labels, rates, ...metrics };
    this.cacheHistoricalData(base, target, "24H", payload);
    return payload;
  }

  // ── Label formatter ────────────────────────────────────────────────────────

  /**
   * @private
   * Format ISO date string to human-readable chart label.
   */
  static _formatDateLabel(isoDate, timeframe) {
    const d = new Date(isoDate + "T12:00:00Z"); // noon UTC avoids timezone edge cases
    if (timeframe === "7D" || timeframe === "30D") {
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    }
    // 90D / 1Y
    return d.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
  }

  // ── Flat line (same currency) ──────────────────────────────────────────────

  /** @private  Returns a trivially flat chart when base === target */
  static _flatLine(currency, timeframe, rate) {
    const { from, to } = this.getDateRangeForTimeframe(timeframe);
    const days   = Math.round((new Date(to) - new Date(from)) / 86_400_000) || 1;
    const labels = Array.from({ length: days }, (_, i) => {
      const d = new Date(from);
      d.setDate(d.getDate() + i);
      return this._formatDateLabel(this._isoDate(d), timeframe);
    });
    const rates  = Array(days).fill(rate);
    return { labels, rates, percentChange: 0, startRate: rate, endRate: rate,
             volatility: { level: "Low", annualisedCV: 0,
                           colorClass: "vol-low", color: "var(--color-success)" } };
  }

  // ── Static fallback payload ────────────────────────────────────────────────

  /**
   * @private
   * When Frankfurter is unreachable we return a minimal flat payload anchored
   * at the live spot rate so charts render without crashing.
   */
  static _fallbackPayload(base, target, timeframe, currentRate) {
    console.warn(`[CurrencyAPI] Using static fallback for ${base}/${target}/${timeframe}`);
    return this._flatLine(`${base}/${target}`, timeframe, currentRate);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLIC API SURFACE  (compatible signatures)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Returns real trend percentages for all main timeframes.
   * Replaces the old sync getExchangeRateTrends() – now async.
   *
   * @param {string} base
   * @param {string} target
   * @param {number} currentRate
   * @returns {Promise<{
   *   currentRate : number,
   *   changes     : { "24H": number, "7D": number, "30D": number, "1Y": number }
   * }>}
   */
  static async getExchangeRateTrends(base, target, currentRate) {
    const timeframes = ["24H", "7D", "30D", "1Y"];

    // Fetch all timeframes concurrently
    const results = await Promise.allSettled(
      timeframes.map(tf => this.fetchHistoricalRates(base, target, tf, currentRate))
    );

    const changes = {};
    timeframes.forEach((tf, i) => {
      changes[tf] = results[i].status === "fulfilled"
        ? results[i].value.percentChange
        : 0;
    });

    return { currentRate, changes };
  }

  /**
   * Returns real top gainers / losers vs USD for a 24H window.
   * Replaces the old sync getTopMovers() – now async.
   *
   * @param {Object} rates  — live rates map from fetchExchangeRates()
   * @returns {Promise<{ gainers: Object[], losers: Object[] }>}
   */
  static async getTopMovers(rates) {
    const currencies = Object.keys(this.CURRENCY_DETAILS).filter(c => c !== "USD" && rates[c]);

    // Fetch 24H history for all currencies concurrently
    const fetches = currencies.map(async (currency) => {
      const rate    = rates[currency];
      const history = await this.fetchHistoricalRates("USD", currency, "24H", rate);
      return {
        code   : currency,
        name   : this.CURRENCY_DETAILS[currency].name,
        flag   : this.CURRENCY_DETAILS[currency].flag,
        change : history.percentChange,
        rate,
      };
    });

    const settled = await Promise.allSettled(fetches);
    const list    = settled
      .filter(r => r.status === "fulfilled")
      .map(r => r.value);

    list.sort((a, b) => b.change - a.change);

    const gainers = list.slice(0, 3);
    const losers  = list.slice(-3).reverse();

    return { gainers, losers };
  }
}
