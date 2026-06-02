/**
 * GlobalFX Pro - Currency Converter Engine
 * Class-based design to calculate rates and commit operations to storage.
 */

class CurrencyConverter {
  /**
   * Performs conversion calculation between base and target currencies
   * @param {number} amount Source amount to convert
   * @param {string} fromCode Source currency code (e.g. "USD")
   * @param {string} toCode Target currency code (e.g. "EUR")
   * @param {Object} rates Latest rates mapping
   * @returns {number} Converted value
   */
  static convert(amount, fromCode, toCode, rates) {
    if (isNaN(amount) || amount <= 0) return 0;
    const rateBase = rates[fromCode];
    const rateTarget = rates[toCode];
    if (!rateBase || !rateTarget) return 0;
    const conversionRate = rateTarget / rateBase;
    return amount * conversionRate;
  }

  /**
   * Commits a transaction to the history database
   * @param {string} fromCode Source currency code
   * @param {string} toCode Target currency code
   * @param {number} amount Original amount
   * @param {number} result Resulting amount
   * @param {Object} rates Latest rates mapping
   * @returns {Object} Newly saved conversion record
   */
  static commitTransaction(fromCode, toCode, amount, result, rates) {
    const rateBase = rates[fromCode] || 1;
    const rateTarget = rates[toCode] || 1;
    const conversionRate = rateTarget / rateBase;

    const conversionEntry = {
      id: "conv_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      from: fromCode,
      to: toCode,
      amount: parseFloat(amount),
      result: parseFloat(result),
      rate: conversionRate
    };

    StorageManager.logConversion(conversionEntry);
    return conversionEntry;
  }
}
