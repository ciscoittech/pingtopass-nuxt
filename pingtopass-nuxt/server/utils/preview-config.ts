/**
 * Preview Environment Configuration
 * Manages feature flags, debug settings, and mock data for preview deployments
 */

import type { H3Event } from 'h3';

export interface PreviewConfig {
  isPreview: boolean;
  prNumber?: string;
  branchName?: string;
  createdAt?: string;
  features: PreviewFeatures;
  debug: DebugConfig;
  mockData: MockDataConfig;
}

export interface PreviewFeatures {
  // Feature flags for preview-only features
  experimentalAuth: boolean;
  aiQuestionGeneration: boolean;
  advancedAnalytics: boolean;
  betaUI: boolean;
  performanceMonitoring: boolean;
  errorTracking: boolean;
  mockPayments: boolean;
  unlimitedQuestions: boolean;
  allExamsUnlocked: boolean;
  debugPanel: boolean;
}

export interface DebugConfig {
  enabled: boolean;
  showErrors: boolean;
  showPerformance: boolean;
  showDatabaseQueries: boolean;
  showApiCalls: boolean;
  verboseLogging: boolean;
  slowQueryWarning: number; // ms
}

export interface MockDataConfig {
  enabled: boolean;
  useMockDatabase: boolean;
  useMockAuth: boolean;
  useMockPayments: boolean;
  mockUserCount: number;
  mockQuestionCount: number;
  responseDelay: number; // ms
}

/**
 * Get preview configuration from environment and request context
 */
export function getPreviewConfig(event: H3Event): PreviewConfig {
  const env = useRuntimeConfig();
  const isPreview = env.ENVIRONMENT === 'preview' || env.PREVIEW_MODE === 'true';
  
  // Get preview-specific environment variables
  const prNumber = (env.PREVIEW_PR_NUMBER as string) || '';
  const branchName = (env.PREVIEW_BRANCH_NAME as string) || '';
  const createdAt = (env.PREVIEW_CREATED_AT as string) || '';
  
  // Check for feature flag overrides in query params (for testing)
  const query = getQuery(event);
  const featureOverrides = query._features ? 
    (typeof query._features === 'string' ? query._features.split(',') : []) : [];
  
  return {
    isPreview,
    prNumber,
    branchName,
    createdAt,
    features: getPreviewFeatures(isPreview, featureOverrides),
    debug: getDebugConfig(isPreview, query._debug === 'true'),
    mockData: getMockDataConfig(isPreview, query._mock === 'true')
  };
}

/**
 * Get feature flags for preview environment
 */
function getPreviewFeatures(isPreview: boolean, overrides: string[] = []): PreviewFeatures {
  if (!isPreview) {
    return {
      experimentalAuth: false,
      aiQuestionGeneration: false,
      advancedAnalytics: false,
      betaUI: false,
      performanceMonitoring: false,
      errorTracking: false,
      mockPayments: false,
      unlimitedQuestions: false,
      allExamsUnlocked: false,
      debugPanel: false
    };
  }
  
  // Enable all features in preview by default
  return {
    experimentalAuth: overrides.includes('experimental-auth') || true,
    aiQuestionGeneration: overrides.includes('ai-generation') || true,
    advancedAnalytics: overrides.includes('analytics') || false, // Disabled to save costs
    betaUI: overrides.includes('beta-ui') || true,
    performanceMonitoring: overrides.includes('performance') || true,
    errorTracking: overrides.includes('error-tracking') || true,
    mockPayments: overrides.includes('mock-payments') || true,
    unlimitedQuestions: true, // Always enabled in preview
    allExamsUnlocked: true, // Always enabled in preview
    debugPanel: overrides.includes('debug-panel') || true
  };
}

/**
 * Get debug configuration for preview environment
 */
function getDebugConfig(isPreview: boolean, forceEnable: boolean = false): DebugConfig {
  const enabled = isPreview || forceEnable;
  
  return {
    enabled,
    showErrors: enabled,
    showPerformance: enabled,
    showDatabaseQueries: enabled,
    showApiCalls: enabled,
    verboseLogging: enabled,
    slowQueryWarning: enabled ? 100 : 1000 // 100ms in preview, 1s in production
  };
}

/**
 * Get mock data configuration for preview environment
 */
function getMockDataConfig(isPreview: boolean, forceEnable: boolean = false): MockDataConfig {
  const enabled = (isPreview && process.env.MOCK_DATA_ENABLED === 'true') || forceEnable;
  
  return {
    enabled,
    useMockDatabase: enabled,
    useMockAuth: enabled,
    useMockPayments: enabled,
    mockUserCount: 100,
    mockQuestionCount: 500,
    responseDelay: enabled ? 50 : 0 // Add slight delay to simulate real conditions
  };
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(event: H3Event, feature: keyof PreviewFeatures): boolean {
  const config = getPreviewConfig(event);
  return config.features[feature];
}

/**
 * Add preview metadata to response headers
 */
export function addPreviewHeaders(event: H3Event, config: PreviewConfig): void {
  if (!config.isPreview) return;
  
  setHeader(event, 'X-Preview-Mode', 'true');
  setHeader(event, 'X-Preview-PR', config.prNumber || '');
  setHeader(event, 'X-Preview-Branch', config.branchName || '');
  setHeader(event, 'X-Preview-Created', config.createdAt || '');
  setHeader(event, 'X-Preview-Features', Object.entries(config.features)
    .filter(([_, enabled]) => enabled)
    .map(([feature]) => feature)
    .join(','));
}

/**
 * Generate mock data for preview testing
 */
export function generateMockData<T>(
  event: H3Event,
  generator: () => T,
  options: { delay?: boolean } = {}
): Promise<T> {
  const config = getPreviewConfig(event);
  
  if (!config.mockData.enabled) {
    throw new Error('Mock data is not enabled');
  }
  
  // Add response delay if configured
  const delay = options.delay !== false ? config.mockData.responseDelay : 0;
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(generator());
    }, delay);
  });
}

/**
 * Log debug information in preview mode
 */
export function debugLog(event: H3Event, category: string, message: string, data?: any): void {
  const config = getPreviewConfig(event);
  
  if (!config.debug.enabled) return;
  
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    category,
    message,
    data,
    preview: {
      pr: config.prNumber,
      branch: config.branchName
    }
  };
  
  // In preview, log to console with formatting
  if (config.debug.verboseLogging) {
    console.log(`[${timestamp}] [${category}] ${message}`, data || '');
  }
  
  // Could also send to external logging service if needed
  // sendToLoggingService(logEntry);
}

/**
 * Wrap database queries with preview monitoring
 */
export async function withPreviewMonitoring<T>(
  event: H3Event,
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const config = getPreviewConfig(event);
  
  if (!config.debug.showDatabaseQueries) {
    return queryFn();
  }
  
  const startTime = Date.now();
  
  try {
    const result = await queryFn();
    const duration = Date.now() - startTime;
    
    // Log slow queries
    if (duration > config.debug.slowQueryWarning) {
      debugLog(event, 'database', `Slow query detected: ${queryName}`, {
        duration: `${duration}ms`,
        query: queryName
      });
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    debugLog(event, 'database', `Query failed: ${queryName}`, {
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Create a preview-safe API response
 */
export function createPreviewResponse<T>(
  event: H3Event,
  data: T,
  options: { 
    status?: number;
    headers?: Record<string, string>;
    includeDebug?: boolean;
  } = {}
): any {
  const config = getPreviewConfig(event);
  
  // Add preview headers
  addPreviewHeaders(event, config);
  
  // Add custom headers
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      setHeader(event, key, value);
    });
  }
  
  // Set status code
  if (options.status) {
    setResponseStatus(event, options.status);
  }
  
  // Include debug information if requested
  if (config.isPreview && config.debug.enabled && options.includeDebug !== false) {
    return {
      data,
      _preview: {
        mode: true,
        pr: config.prNumber,
        branch: config.branchName,
        features: Object.entries(config.features)
          .filter(([_, enabled]) => enabled)
          .map(([feature]) => feature),
        timestamp: new Date().toISOString()
      }
    };
  }
  
  return data;
}

/**
 * Preview-only middleware to inject debug toolbar
 */
export function injectDebugToolbar(html: string, config: PreviewConfig): string {
  if (!config.isPreview || !config.features.debugPanel) {
    return html;
  }
  
  const debugToolbar = `
    <div id="preview-debug-toolbar" style="
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 10px;
      font-size: 12px;
      font-family: monospace;
      z-index: 99999;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 -2px 10px rgba(0,0,0,0.2);
    ">
      <div style="display: flex; gap: 20px; align-items: center;">
        <strong>🚧 PREVIEW MODE</strong>
        <span>PR #${config.prNumber || 'N/A'}</span>
        <span>Branch: ${config.branchName || 'N/A'}</span>
        <span>Created: ${config.createdAt ? new Date(config.createdAt).toLocaleString() : 'N/A'}</span>
      </div>
      <div style="display: flex; gap: 10px;">
        <button onclick="document.getElementById('preview-debug-toolbar').style.display='none'" style="
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          padding: 5px 10px;
          border-radius: 3px;
          cursor: pointer;
        ">Hide</button>
      </div>
    </div>
    <script>
      // Add keyboard shortcut to toggle debug toolbar
      document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
          const toolbar = document.getElementById('preview-debug-toolbar');
          toolbar.style.display = toolbar.style.display === 'none' ? 'flex' : 'none';
        }
      });
      
      // Log preview configuration to console
      console.log('%c🚧 Preview Mode Active', 'background: #667eea; color: white; padding: 5px 10px; border-radius: 3px;');
      console.log('Preview Configuration:', ${JSON.stringify({
        pr: config.prNumber,
        branch: config.branchName,
        features: config.features
      }, null, 2)});
    </script>
  `;
  
  // Inject before closing body tag
  return html.replace('</body>', debugToolbar + '</body>');
}