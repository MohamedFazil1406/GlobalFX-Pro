/**
 * GlobalFX Pro - Portfolio Logic
 */

class PortfolioManager {
  static addHolding(currency, amount, purchaseRate) {
    const portfolio = StorageManager.getPortfolio();
    portfolio.push({
      id: Date.now(),
      currency: currency.toUpperCase(),
      amount: parseFloat(amount),
      purchaseRate: parseFloat(purchaseRate),
      date: new Date().toISOString()
    });
    StorageManager.savePortfolio(portfolio);
  }

  static deleteHolding(id) {
    let portfolio = StorageManager.getPortfolio();
    portfolio = portfolio.filter(h => h.id !== id);
    StorageManager.savePortfolio(portfolio);
  }

  static getAnalytics(rates, baseCurrency = "USD") {
    const portfolio = StorageManager.getPortfolio();
    let totalInvested = 0;
    let currentValue = 0;

    portfolio.forEach(h => {
      // Calculate how much base currency this was worth when bought
      const invested = h.amount / h.purchaseRate; 
      totalInvested += invested;

      // Calculate how much it is worth now
      const rateBase = rates[baseCurrency] || 1;
      const rateTarget = rates[h.currency] || 1;
      
      // Calculate current rate relative to base currency
      const currentRate = rateTarget / rateBase;
      const current = h.amount / currentRate;
      currentValue += current;
    });

    const roi = totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0;
    return { totalInvested, currentValue, roi };
  }
}