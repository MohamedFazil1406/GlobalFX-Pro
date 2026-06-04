/**
 * GlobalFX Pro - Storage Engine
 * Manages secure storage operations inside the local browser sandbox.
 */

class StorageManager {
  static HISTORY_KEY = "globalfx_conversions_history";
  static FAVORITES_KEY = "globalfx_favorites";
  static THEME_KEY = "globalfx_theme";
  static PORTFOLIO_KEY = "globalfx_portfolio"; // NEW KEY

  static getConversionHistory() {
    const data = localStorage.getItem(this.HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  }

  static logConversion(entry) {
    const history = this.getConversionHistory();
    history.unshift(entry);
    if (history.length > 500) {
      history.pop();
    }
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
    return history;
  }

  static clearConversionHistory() {
    localStorage.removeItem(this.HISTORY_KEY);
  }

  static getFavoritePairs() {
    const data = localStorage.getItem(this.FAVORITES_KEY);
    return data ? JSON.parse(data) : ["USD/EUR", "EUR/GBP", "USD/INR", "GBP/JPY"];
  }

  static toggleFavoritePair(pair) {
    const favorites = this.getFavoritePairs();
    const index = favorites.indexOf(pair);
    if (index > -1) {
      favorites.splice(index, 1);
    } else {
      favorites.push(pair);
    }
    localStorage.setItem(this.FAVORITES_KEY, JSON.stringify(favorites));
    return favorites;
  }

  static saveTheme(theme) {
    localStorage.setItem(this.THEME_KEY, theme);
  }

  static getTheme() {
    return localStorage.getItem(this.THEME_KEY) || "dark";
  }

  // --- NEW PORTFOLIO METHODS ---
  static getPortfolio() {
    const data = localStorage.getItem(this.PORTFOLIO_KEY);
    return data ? JSON.parse(data) : [];
  }

  static savePortfolio(portfolio) {
    localStorage.setItem(this.PORTFOLIO_KEY, JSON.stringify(portfolio));
  }
}