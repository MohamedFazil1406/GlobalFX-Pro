/**
 * GlobalFX Pro - Export Manager
 * Class-based CSV formatting and file generator.
 */

class ExportManager {
  /**
   * Generates and triggers automatic download of conversion history in CSV format
   * @param {Array} history Array of conversion transaction objects
   */
  static exportToCSV(history) {
    if (!history || history.length === 0) {
      return { success: false, message: "No conversion history available to export." };
    }

    // Define headers
    const headers = ["ID", "Timestamp", "From Currency", "To Currency", "Amount", "Exchange Rate", "Result Amount"];
    
    // Format rows
    const rows = history.map(entry => [
      entry.id,
      new Date(entry.timestamp).toLocaleString(),
      entry.from,
      entry.to,
      entry.amount.toFixed(2),
      entry.rate.toFixed(6),
      entry.result.toFixed(2)
    ]);

    // Join content
    const csvContent = [
      headers.join(","), 
      ...rows.map(row => row.map(val => `"${val}"`).join(","))
    ].join("\n");
    
    // Create download link
    try {
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `GlobalFX_History_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return { success: true };
    } catch (error) {
      console.error("CSV Export failed:", error);
      return { success: false, message: "Export failed due to write permissions or browser blocks." };
    }
  }
}
