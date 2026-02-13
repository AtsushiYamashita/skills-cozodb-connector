/**
 * Metrics Collection (Prometheus-compatible)
 * 
 * Provides counters, gauges, and histograms for observability.
 * 
 * @module metrics
 */

// Simple in-memory metrics storage
class MetricsRegistry {
  constructor() {
    this.counters = new Map();
    this.gauges = new Map();
    this.histograms = new Map();
  }

  /**
   * Increment a counter
   * @param {string} name - Metric name
   * @param {Object} labels - Label key-value pairs
   * @param {number} value - Increment amount (default 1)
   */
  incCounter(name, labels = {}, value = 1) {
    const key = this._makeKey(name, labels);
    const current = this.counters.get(key) || { name, labels, value: 0 };
    current.value += value;
    this.counters.set(key, current);
  }

  /**
   * Set a gauge value
   * @param {string} name - Metric name
   * @param {Object} labels - Label key-value pairs
   * @param {number} value - Gauge value
   */
  setGauge(name, labels = {}, value) {
    const key = this._makeKey(name, labels);
    this.gauges.set(key, { name, labels, value });
  }

  /**
   * Record a histogram observation
   * @param {string} name - Metric name
   * @param {Object} labels - Label key-value pairs
   * @param {number} value - Observed value
   */
  observeHistogram(name, labels = {}, value) {
    const key = this._makeKey(name, labels);
    const hist = this.histograms.get(key) || { name, labels, observations: [] };
    hist.observations.push(value);
    
    // Keep only last 1000 observations to prevent memory leaks
    if (hist.observations.length > 1000) {
      hist.observations = hist.observations.slice(-1000);
    }
    
    this.histograms.set(key, hist);
  }

  /**
   * Export metrics in Prometheus text format
   * @returns {string} Prometheus-formatted metrics
   */
  export() {
    const lines = [];

    // Export counters
    for (const [key, metric] of this.counters) {
      const labelsStr = this._formatLabels(metric.labels);
      lines.push(`${metric.name}${labelsStr} ${metric.value}`);
    }

    // Export gauges
    for (const [key, metric] of this.gauges) {
      const labelsStr = this._formatLabels(metric.labels);
      lines.push(`${metric.name}${labelsStr} ${metric.value}`);
    }

    // Export histograms (simplified - just p50, p95, p99)
    for (const [key, hist] of this.histograms) {
      const sorted = hist.observations.slice().sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
      const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
      const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
      
      const labelsStr = this._formatLabels(hist.labels);
      lines.push(`${hist.name}_p50${labelsStr} ${p50.toFixed(2)}`);
      lines.push(`${hist.name}_p95${labelsStr} ${p95.toFixed(2)}`);
      lines.push(`${hist.name}_p99${labelsStr} ${p99.toFixed(2)}`);
      lines.push(`${hist.name}_count${labelsStr} ${sorted.length}`);
    }

    return lines.join('\n') + '\n';
  }

  /**
   * Export metrics as JSON
   * @returns {Object} Metrics object
   */
  exportJSON() {
    return {
      counters: Array.from(this.counters.values()),
      gauges: Array.from(this.gauges.values()),
      histograms: Array.from(this.histograms.entries()).map(([key, hist]) => {
        const sorted = hist.observations.slice().sort((a, b) => a - b);
        return {
          name: hist.name,
          labels: hist.labels,
          p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
          p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
          p99: sorted[Math.floor(sorted.length * 0.99)] || 0,
          count: sorted.length
        };
      })
    };
  }

  _makeKey(name, labels) {
    const labelPairs = Object.entries(labels).sort();
    return `${name}{${labelPairs.map(([k, v]) => `${k}="${v}"`).join(',')}}`;
  }

  _formatLabels(labels) {
    const pairs = Object.entries(labels);
    if (pairs.length === 0) return '';
    return `{${pairs.map(([k, v]) => `${k}="${v}"`).join(',')}}`;
  }
}

// Global registry
const registry = new MetricsRegistry();

// Common metrics
const Metrics = {
  /**
   * Record query execution
   */
  queryExecuted: (success, durationMs) => {
    registry.incCounter('cozodb_queries_total', { success: success ? 'true' : 'false' });
    registry.observeHistogram('cozodb_query_duration_ms', {}, durationMs);
  },

  /**
   * Record memory usage
   */
  memoryUsage: (bytesWritten, maxBytes) => {
    registry.setGauge('cozodb_memory_bytes', { type: 'used' }, bytesWritten);
    registry.setGauge('cozodb_memory_bytes', { type: 'max' }, maxBytes);
    registry.setGauge('cozodb_memory_usage_ratio', {}, bytesWritten / maxBytes);
  },

  /**
   * Record sync operation
   */
  syncCompleted: (direction, itemCount) => {
    registry.incCounter('cozodb_sync_total', { direction }, 1);
    registry.incCounter('cozodb_sync_items', { direction }, itemCount);
  },

  /**
   * Export all metrics
   */
  export: () => registry.export(),
  exportJSON: () => registry.exportJSON(),
  
  // Expose registry for advanced use
  registry
};

module.exports = Metrics;
