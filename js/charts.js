/**
 * GlobalFX Pro - Chart Engine
 * Encapsulated class for handling Chart.js instances and responsive visual updates.
 */

class ChartManager {
  static activeChart = null;

  /**
   * Destroys existing chart to prevent memory leaks and hover artifacts
   */
  static destroyActiveChart() {
    if (this.activeChart) {
      this.activeChart.destroy();
      this.activeChart = null;
    }
  }

  /**
   * Initializes or updates the historical trends line chart
   * @param {string} canvasId DOM element ID for the target canvas
   * @param {Object} data Historical rates data object (labels, rates, percentChange)
   * @param {boolean} isDarkMode Current UI theme state
   */
  static renderHistoricalChart(canvasId, data, isDarkMode) {
    this.destroyActiveChart();

    const canvasEl = document.getElementById(canvasId);
    if (!canvasEl) return;
    const ctx = canvasEl.getContext("2d");
    
    // Choose chart colors based on positive/negative trend
    const isPositive = data.percentChange >= 0;
    const primaryColor = isPositive ? "#10B981" : "#EF4444"; // Emerald or Crimson
    const accentColor = isPositive ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)";
    
    // Grid and text colors depending on Theme (Dark vs Light)
    const gridColor = isDarkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(15, 23, 42, 0.05)";
    const textColor = isDarkMode ? "#94A3B8" : "#475569";

    // Create vertical gradient for fill
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, accentColor);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    const chartConfig = {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "Exchange Rate",
            data: data.rates,
            borderColor: primaryColor,
            borderWidth: 2.5,
            pointBackgroundColor: primaryColor,
            pointBorderColor: isDarkMode ? "#0F172A" : "#FFFFFF",
            pointBorderWidth: 1.5,
            pointRadius: 0, // Hidden by default
            pointHoverRadius: 6, // Show on hover
            pointHitRadius: 16,
            fill: true,
            backgroundColor: gradient,
            tension: 0.35, // Smooth curves
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: "index",
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            enabled: true,
            backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF",
            titleColor: isDarkMode ? "#F8FAFC" : "#0F172A",
            bodyColor: isDarkMode ? "#F8FAFC" : "#0F172A",
            titleFont: {
              family: "'Inter', sans-serif",
              size: 12,
              weight: "600"
            },
            bodyFont: {
              family: "'Inter', sans-serif",
              size: 14,
              weight: "500"
            },
            padding: 12,
            cornerRadius: 8,
            borderColor: isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
            borderWidth: 1,
            displayColors: false,
            callbacks: {
              label: function (context) {
                const val = context.parsed.y;
                return `1 Unit = ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: gridColor,
              drawBorder: false,
            },
            ticks: {
              color: textColor,
              font: {
                family: "'Inter', sans-serif",
                size: 11
              },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 8
            }
          },
          y: {
            grid: {
              color: gridColor,
              drawBorder: false,
            },
            ticks: {
              color: textColor,
              font: {
                family: "'Inter', sans-serif",
                size: 11
              },
              callback: function(value) {
                return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
              }
            }
          }
        },
        animations: {
          tension: {
            duration: 600,
            easing: 'easeOutQuart',
            from: 0.5,
            to: 0.35,
            loop: false
          },
          y: {
            duration: 800,
            easing: 'easeOutQuart'
          }
        }
      }
    };

    this.activeChart = new Chart(ctx, chartConfig);
  }
}
