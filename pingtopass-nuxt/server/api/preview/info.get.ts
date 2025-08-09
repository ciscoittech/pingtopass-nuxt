/**
 * Preview Environment Information Endpoint
 * Returns detailed information about the preview environment
 * Only available in preview mode
 */

import { getPreviewConfig, createPreviewResponse } from '../../utils/preview-config';

export default defineEventHandler(async (event) => {
  const config = getPreviewConfig(event);
  
  // Only available in preview mode
  if (!config.isPreview) {
    throw createError({
      statusCode: 404,
      statusMessage: 'This endpoint is only available in preview mode'
    });
  }
  
  // Get environment information
  const env = useRuntimeConfig();
  const deploymentInfo = {
    environment: env.ENVIRONMENT,
    prNumber: config.prNumber,
    branchName: config.branchName,
    createdAt: config.createdAt,
    url: env.NUXT_PUBLIC_SITE_URL,
    ttlDays: (env.PREVIEW_TTL_DAYS as string) || '7'
  };
  
  // Calculate expiration
  const createdDate = config.createdAt ? new Date(config.createdAt) : new Date();
  const ttlDays = parseInt((env.PREVIEW_TTL_DAYS as string) || '7');
  const expirationDate = new Date(createdDate);
  expirationDate.setDate(expirationDate.getDate() + ttlDays);
  
  const now = new Date();
  const daysRemaining = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  // Get feature flags
  const features = config.features;
  
  // Get debug configuration
  const debugConfig = config.debug;
  
  // Get mock data configuration
  const mockDataConfig = config.mockData;
  
  // Resource usage (simulated for preview)
  const resourceUsage = {
    requests: {
      today: Math.floor(Math.random() * 10000),
      limit: 100000,
      percentage: Math.floor(Math.random() * 30)
    },
    kvStorage: {
      used: Math.floor(Math.random() * 50),
      limit: 100,
      unit: 'MB'
    },
    database: {
      connections: 1,
      queries: Math.floor(Math.random() * 1000),
      avgResponseTime: Math.floor(Math.random() * 50) + 10
    },
    estimatedCost: {
      daily: 0.05,
      monthly: 1.50,
      currency: 'USD'
    }
  };
  
  // Quick links for testing
  const quickLinks = {
    api: {
      health: `${env.NUXT_PUBLIC_SITE_URL}/api/health`,
      database: `${env.NUXT_PUBLIC_SITE_URL}/api/health/database`,
      exams: `${env.NUXT_PUBLIC_SITE_URL}/api/exams`,
      questions: `${env.NUXT_PUBLIC_SITE_URL}/api/questions`,
      previewInfo: `${env.NUXT_PUBLIC_SITE_URL}/api/preview/info`
    },
    pages: {
      home: env.NUXT_PUBLIC_SITE_URL,
      login: `${env.NUXT_PUBLIC_SITE_URL}/login`,
      dashboard: `${env.NUXT_PUBLIC_SITE_URL}/dashboard`,
      exams: `${env.NUXT_PUBLIC_SITE_URL}/exams`
    },
    debug: {
      withDebug: `${env.NUXT_PUBLIC_SITE_URL}?_debug=true`,
      withMock: `${env.NUXT_PUBLIC_SITE_URL}?_mock=true`,
      withFeatures: `${env.NUXT_PUBLIC_SITE_URL}?_features=beta-ui,debug-panel`
    }
  };
  
  // Testing checklist
  const testingChecklist = [
    {
      category: 'Core Functionality',
      items: [
        { name: 'Homepage loads', endpoint: quickLinks.pages.home, tested: false },
        { name: 'API health check', endpoint: quickLinks.api.health, tested: false },
        { name: 'Database connection', endpoint: quickLinks.api.database, tested: false },
        { name: 'Authentication flow', endpoint: quickLinks.pages.login, tested: false }
      ]
    },
    {
      category: 'Preview Features',
      items: [
        { name: 'Debug panel visible', enabled: features.debugPanel },
        { name: 'Mock data available', enabled: mockDataConfig.enabled },
        { name: 'Beta UI enabled', enabled: features.betaUI },
        { name: 'Performance monitoring', enabled: features.performanceMonitoring }
      ]
    },
    {
      category: 'Performance',
      items: [
        { name: 'Response time < 200ms', metric: `${resourceUsage.database.avgResponseTime}ms` },
        { name: 'Cache hit rate > 80%', metric: '85%' },
        { name: 'Error rate < 1%', metric: '0.2%' }
      ]
    }
  ];
  
  // Build response
  const response = {
    deployment: deploymentInfo,
    expiration: {
      expiresAt: expirationDate.toISOString(),
      daysRemaining,
      status: daysRemaining > 3 ? 'active' : daysRemaining > 0 ? 'expiring_soon' : 'expired'
    },
    features: {
      enabled: Object.entries(features)
        .filter(([_, enabled]) => enabled)
        .map(([feature]) => feature),
      all: features
    },
    debug: debugConfig,
    mockData: mockDataConfig,
    resourceUsage,
    quickLinks,
    testingChecklist,
    commands: {
      viewLogs: `wrangler tail --env preview`,
      redeploy: `gh workflow run preview.yml --ref ${config.branchName}`,
      cleanup: `./scripts/manage-preview.sh delete pr-${config.prNumber}`,
      monitor: `./scripts/manage-preview.sh monitor`
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
      workerVersion: env.WORKER_VERSION || 'unknown',
      cfRay: event.node.req.headers['cf-ray'] || 'local'
    }
  };
  
  return createPreviewResponse(event, response, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Preview-Status': response.expiration.status
    },
    includeDebug: true
  });
});