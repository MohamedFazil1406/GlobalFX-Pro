/**
 * GlobalFX Pro - Storage Engine
 * Manages secure storage operations inside the local browser sandbox.
 */

class StorageManager {
  static HISTORY_KEY = "globalfx_conversions_history";
  static FAVORITES_KEY = "globalfx_favorites";
  static THEME_KEY = "globalfx_theme";

  /**
   * Retrieves full conversion history array
   * @returns {Array} List of past transactions
   */
  static getConversionHistory() {
    const data = localStorage.getItem(this.HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Appends a new conversion entry and limits storage length to 500 records
   * @param {Object} entry Conversion record metadata
   */
  static logConversion(entry) {
    const history = this.getConversionHistory();
    history.unshift(entry);
    if (history.length > 500) {
      history.pop();
    }
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
    return history;
  }

  /**
   * Completely clears the history dataset
   */
  static clearConversionHistory() {
    localStorage.removeItem(this.HISTORY_KEY);
  }

  /**
   * Retrieves list of saved favorite currency pairs
   * @returns {Array} Saved currency pairs e.g. ["USD/EUR"]
   */
  static getFavoritePairs() {
    const data = localStorage.getItem(this.FAVORITES_KEY);
    return data ? JSON.parse(data) : ["USD/EUR", "EUR/GBP", "USD/INR", "GBP/JPY"];
  }

  /**
   * Toggles the presence of a favorite pair
   * @param {string} pair Target currency pair string e.g. "USD/EUR"
   * @returns {Array} Updated favorite pairs list
   */
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

  /**
   * Saves UI theme preference
   * @param {string} theme "light" or "dark"
   */
  static saveTheme(theme) {
    localStorage.setItem(this.THEME_KEY, theme);
  }

  /**
   * Gets UI theme preference
   * @returns {string} theme "light" or "dark"
   */
  static getTheme() {
    return localStorage.getItem(this.THEME_KEY) || "dark";
  }
}
