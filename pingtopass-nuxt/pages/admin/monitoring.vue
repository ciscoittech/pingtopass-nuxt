<template>
  <div class="monitoring-dashboard">
    <header class="dashboard-header">
      <h1>PingToPass System Monitoring</h1>
      <div class="header-controls">
        <button @click="refreshData" :disabled="loading" class="refresh-btn">
          <span v-if="loading">Refreshing...</span>
          <span v-else>Refresh</span>
        </button>
        <div class="auto-refresh">
          <label>
            <input 
              type="checkbox" 
              v-model="autoRefresh" 
              @change="toggleAutoRefresh"
            >
            Auto-refresh (30s)
          </label>
        </div>
      </div>
    </header>

    <div class="dashboard-grid">
      <!-- System Health Overview -->
      <section class="health-overview card">
        <h2>System Health</h2>
        <div class="status-indicator" :class="overallStatus">
          <div class="status-dot"></div>
          <span class="status-text">{{ overallStatus.toUpperCase() }}</span>
        </div>
        <div class="health-metrics" v-if="healthData">
          <div class="metric">
            <span class="metric-label">Uptime</span>
            <span class="metric-value">{{ formatUptime(healthData.system?.uptime?.seconds || 0) }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Memory</span>
            <span class="metric-value">{{ formatMemory(healthData.system?.memory?.usage) }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Cache Hit Rate</span>
            <span class="metric-value">{{ healthData.system?.cache?.hitRate?.toFixed(1) || 0 }}%</span>
          </div>
          <div class="metric">
            <span class="metric-label">Active Connections</span>
            <span class="metric-value">{{ healthData.system?.connections?.active || 0 }}</span>
          </div>
        </div>
      </section>

      <!-- Request Performance -->
      <section class="request-performance card">
        <h2>Request Performance</h2>
        <div class="performance-stats" v-if="metricsData">
          <div class="stat">
            <span class="stat-value">{{ metricsData.requests?.summary?.totalRequests || 0 }}</span>
            <span class="stat-label">Total Requests</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ metricsData.requests?.summary?.avgResponseTime || 0 }}ms</span>
            <span class="stat-label">Avg Response Time</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ metricsData.requests?.summary?.slowRequestRate || 0 }}%</span>
            <span class="stat-label">Slow Requests</span>
          </div>
        </div>

        <h3>Slowest Endpoints</h3>
        <div class="endpoint-list">
          <div 
            v-for="endpoint in metricsData?.requests?.slowEndpoints || []" 
            :key="endpoint.path"
            class="endpoint-item"
          >
            <span class="endpoint-path">{{ endpoint.path }}</span>
            <span class="endpoint-time">{{ endpoint.avgTime }}ms</span>
            <span class="endpoint-requests">{{ endpoint.requests }} req</span>
          </div>
        </div>
      </section>

      <!-- Error Tracking -->
      <section class="error-tracking card">
        <h2>Error Tracking</h2>
        <div class="error-stats" v-if="metricsData?.errors">
          <div class="stat error">
            <span class="stat-value">{{ metricsData.errors.summary?.totalErrors || 0 }}</span>
            <span class="stat-label">Total Errors</span>
          </div>
          <div class="stat error">
            <span class="stat-value">{{ metricsData.errors.summary?.errorRate?.toFixed(2) || 0 }}%</span>
            <span class="stat-label">Error Rate</span>
          </div>
          <div class="stat critical">
            <span class="stat-value">{{ metricsData.errors.summary?.criticalErrors || 0 }}</span>
            <span class="stat-label">Critical Errors</span>
          </div>
        </div>

        <h3>Error Types</h3>
        <div class="error-types">
          <div 
            v-for="errorType in metricsData?.errors?.summary?.topErrorTypes || []"
            :key="errorType.type"
            class="error-type-item"
          >
            <span class="error-type">{{ errorType.type }}</span>
            <span class="error-count">{{ errorType.count }}</span>
          </div>
        </div>
      </section>

      <!-- Database Performance -->
      <section class="database-performance card">
        <h2>Database Performance</h2>
        <div class="db-stats" v-if="metricsData?.database">
          <div class="stat">
            <span class="stat-value">{{ metricsData.database.summary?.totalQueries || 0 }}</span>
            <span class="stat-label">Total Queries</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ metricsData.database.summary?.avgQueryTime || 0 }}ms</span>
            <span class="stat-label">Avg Query Time</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ metricsData.database.summary?.slowQueryRate || 0 }}%</span>
            <span class="stat-label">Slow Queries</span>
          </div>
        </div>

        <h3>Slowest Tables</h3>
        <div class="table-list">
          <div 
            v-for="table in metricsData?.database?.slowestTables || []"
            :key="table.table"
            class="table-item"
          >
            <span class="table-name">{{ table.table }}</span>
            <span class="table-time">{{ table.avgTime }}ms</span>
            <span class="table-queries">{{ table.queries }} queries</span>
          </div>
        </div>
      </section>

      <!-- Recent Logs -->
      <section class="recent-logs card full-width">
        <div class="logs-header">
          <h2>Recent Logs</h2>
          <div class="log-controls">
            <select v-model="logLevel" @change="loadLogs">
              <option value="">All Levels</option>
              <option value="error">Errors Only</option>
              <option value="warn">Warnings Only</option>
              <option value="info">Info Only</option>
            </select>
            <input 
              type="text" 
              v-model="logSearch" 
              @input="debouncedLogSearch"
              placeholder="Search logs..."
              class="log-search"
            >
          </div>
        </div>
        
        <div class="logs-container">
          <div 
            v-for="log in logsData?.data?.logs || []"
            :key="`${log.timestamp}-${log.message}`"
            class="log-entry"
            :class="log.level"
          >
            <span class="log-timestamp">{{ formatTimestamp(log.timestamp) }}</span>
            <span class="log-level">{{ log.level.toUpperCase() }}</span>
            <span class="log-message">{{ log.message }}</span>
            <div v-if="log.context" class="log-context">
              {{ JSON.stringify(log.context, null, 2) }}
            </div>
          </div>
          <div v-if="!logsData?.data?.logs?.length" class="no-logs">
            No logs found
          </div>
        </div>
      </section>
    </div>

    <!-- Loading Overlay -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <span>Loading monitoring data...</span>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="error-message">
      <strong>Error:</strong> {{ error }}
      <button @click="error = null" class="close-error">×</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';

// Reactive data
const loading = ref(false);
const error = ref(null);
const autoRefresh = ref(false);
const refreshInterval = ref(null);

// Monitoring data
const healthData = ref(null);
const metricsData = ref(null);
const logsData = ref(null);

// Log filtering
const logLevel = ref('');
const logSearch = ref('');

// Computed properties
const overallStatus = computed(() => {
  if (!healthData.value) return 'unknown';
  return healthData.value.status || 'unknown';
});

// Methods
async function loadHealthData() {
  try {
    const response = await $fetch('/api/monitoring/health');
    healthData.value = response;
  } catch (err) {
    console.error('Failed to load health data:', err);
    throw err;
  }
}

async function loadMetricsData() {
  try {
    const response = await $fetch('/api/monitoring/metrics');
    metricsData.value = response.data;
  } catch (err) {
    console.error('Failed to load metrics data:', err);
    throw err;
  }
}

async function loadLogs() {
  try {
    const params = new URLSearchParams();
    params.append('limit', '50');
    if (logLevel.value) params.append('level', logLevel.value);
    if (logSearch.value) params.append('search', logSearch.value);
    
    const response = await $fetch(`/api/monitoring/logs?${params}`);
    logsData.value = response;
  } catch (err) {
    console.error('Failed to load logs:', err);
    throw err;
  }
}

async function refreshData() {
  if (loading.value) return;
  
  loading.value = true;
  error.value = null;
  
  try {
    await Promise.all([
      loadHealthData(),
      loadMetricsData(),
      loadLogs(),
    ]);
  } catch (err) {
    error.value = err.message || 'Failed to load monitoring data';
  } finally {
    loading.value = false;
  }
}

function toggleAutoRefresh() {
  if (autoRefresh.value) {
    refreshInterval.value = setInterval(refreshData, 30000); // 30 seconds
  } else {
    if (refreshInterval.value) {
      clearInterval(refreshInterval.value);
      refreshInterval.value = null;
    }
  }
}

// Debounced log search
let searchTimeout = null;
function debouncedLogSearch() {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(loadLogs, 300);
}

// Formatting functions
function formatUptime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function formatMemory(bytes) {
  if (!bytes) return 'N/A';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleTimeString();
}

// Lifecycle hooks
onMounted(() => {
  refreshData();
});

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
  }
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
});

// Page metadata
useHead({
  title: 'System Monitoring - PingToPass Admin',
  meta: [
    { name: 'description', content: 'Real-time system monitoring dashboard for PingToPass' }
  ]
});
</script>

<style scoped>
.monitoring-dashboard {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e5e7eb;
}

.dashboard-header h1 {
  color: #1f2937;
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 20px;
}

.refresh-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: #2563eb;
}

.refresh-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.auto-refresh label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 500;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 30px;
}

.card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.full-width {
  grid-column: 1 / -1;
}

.card h2 {
  margin: 0 0 15px 0;
  color: #1f2937;
  font-size: 1.25rem;
  font-weight: 600;
}

.card h3 {
  margin: 20px 0 10px 0;
  color: #374151;
  font-size: 1rem;
  font-weight: 600;
}

/* Health Overview */
.status-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.status-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
}

.status-indicator.healthy .status-dot {
  background: #10b981;
}

.status-indicator.degraded .status-dot {
  background: #f59e0b;
}

.status-indicator.critical .status-dot {
  background: #ef4444;
}

.status-indicator.unknown .status-dot {
  background: #6b7280;
}

.status-text {
  font-weight: 600;
  font-size: 1.1rem;
}

.health-metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.metric-label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.metric-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

/* Performance Stats */
.performance-stats,
.error-stats,
.db-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.stat {
  text-align: center;
  padding: 15px;
  background: #f9fafb;
  border-radius: 6px;
}

.stat.error {
  background: #fef2f2;
}

.stat.critical {
  background: #fee2e2;
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 5px;
}

.stat.error .stat-value {
  color: #dc2626;
}

.stat.critical .stat-value {
  color: #991b1b;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

/* Lists */
.endpoint-list,
.error-types,
.table-list {
  max-height: 200px;
  overflow-y: auto;
}

.endpoint-item,
.error-type-item,
.table-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
}

.endpoint-path,
.error-type,
.table-name {
  font-weight: 500;
  color: #1f2937;
  flex: 1;
}

.endpoint-time,
.endpoint-requests,
.error-count,
.table-time,
.table-queries {
  font-size: 0.875rem;
  color: #6b7280;
  margin-left: 10px;
}

/* Logs */
.logs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.log-controls {
  display: flex;
  gap: 15px;
}

.log-controls select,
.log-search {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

.logs-container {
  max-height: 400px;
  overflow-y: auto;
  background: #f9fafb;
  border-radius: 6px;
  padding: 10px;
}

.log-entry {
  margin-bottom: 10px;
  padding: 10px;
  background: white;
  border-radius: 4px;
  border-left: 3px solid #e5e7eb;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.875rem;
}

.log-entry.error {
  border-left-color: #ef4444;
}

.log-entry.warn {
  border-left-color: #f59e0b;
}

.log-entry.info {
  border-left-color: #3b82f6;
}

.log-entry.debug {
  border-left-color: #6b7280;
}

.log-timestamp {
  color: #6b7280;
  margin-right: 10px;
}

.log-level {
  display: inline-block;
  width: 60px;
  font-weight: 600;
  margin-right: 10px;
}

.log-entry.error .log-level {
  color: #ef4444;
}

.log-entry.warn .log-level {
  color: #f59e0b;
}

.log-entry.info .log-level {
  color: #3b82f6;
}

.log-context {
  margin-top: 8px;
  padding: 8px;
  background: #f3f4f6;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #4b5563;
  white-space: pre-wrap;
}

.no-logs {
  text-align: center;
  color: #6b7280;
  font-style: italic;
  padding: 20px;
}

/* Loading and Error */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  color: #991b1b;
  padding: 15px 20px;
  border-radius: 6px;
  max-width: 400px;
  z-index: 1000;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.close-error {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #991b1b;
  margin-left: 10px;
}

/* Responsive */
@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  
  .dashboard-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
  
  .header-controls {
    justify-content: space-between;
  }
  
  .performance-stats,
  .error-stats,
  .db-stats {
    grid-template-columns: 1fr;
  }
  
  .health-metrics {
    grid-template-columns: 1fr;
  }
}
</style>