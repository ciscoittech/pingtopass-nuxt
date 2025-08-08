/**
 * Turso Database Replication and Edge Distribution Strategy
 * 
 * Optimized for PingToPass global performance requirements:
 * - Primary database in us-east-1 (closest to Cloudflare Edge)
 * - Read replicas in key regions for <200ms global performance
 * - Intelligent routing based on user location
 * - Connection pooling per region
 */

import { getDB, getPerformanceStats } from './db'

// Turso edge regions configuration
export const TURSO_REGIONS = {
  'us-east': {
    name: 'US East',
    location: 'Virginia',
    isPrimary: true,
    url: process.env.TURSO_DATABASE_URL,
    token: process.env.TURSO_AUTH_TOKEN
  },
  'us-west': {
    name: 'US West',
    location: 'California',
    isPrimary: false,
    url: process.env.TURSO_DATABASE_URL_WEST,
    token: process.env.TURSO_AUTH_TOKEN_WEST
  },
  'eu-central': {
    name: 'Europe Central',
    location: 'Frankfurt',
    isPrimary: false,
    url: process.env.TURSO_DATABASE_URL_EU,
    token: process.env.TURSO_AUTH_TOKEN_EU
  },
  'ap-southeast': {
    name: 'Asia Pacific',
    location: 'Singapore',
    isPrimary: false,
    url: process.env.TURSO_DATABASE_URL_AP,
    token: process.env.TURSO_AUTH_TOKEN_AP
  }
} as const

export type TursoRegion = keyof typeof TURSO_REGIONS

// Cloudflare country code to region mapping
export const COUNTRY_TO_REGION_MAP: Record<string, TursoRegion> = {
  // North America
  'US': 'us-east',
  'CA': 'us-east',
  'MX': 'us-west',
  
  // Europe
  'GB': 'eu-central',
  'DE': 'eu-central',
  'FR': 'eu-central',
  'IT': 'eu-central',
  'ES': 'eu-central',
  'NL': 'eu-central',
  'BE': 'eu-central',
  'CH': 'eu-central',
  'AT': 'eu-central',
  'PL': 'eu-central',
  'CZ': 'eu-central',
  'HU': 'eu-central',
  'SE': 'eu-central',
  'NO': 'eu-central',
  'DK': 'eu-central',
  'FI': 'eu-central',
  
  // Asia Pacific
  'AU': 'ap-southeast',
  'NZ': 'ap-southeast',
  'JP': 'ap-southeast',
  'KR': 'ap-southeast',
  'SG': 'ap-southeast',
  'MY': 'ap-southeast',
  'TH': 'ap-southeast',
  'VN': 'ap-southeast',
  'ID': 'ap-southeast',
  'PH': 'ap-southeast',
  'IN': 'ap-southeast',
  'CN': 'ap-southeast',
  'HK': 'ap-southeast',
  'TW': 'ap-southeast',
  
  // Fallback to US East for other regions
  'BR': 'us-east',
  'AR': 'us-east',
  'CL': 'us-east',
  'ZA': 'eu-central',
  'NG': 'eu-central',
  'EG': 'eu-central'
}

/**
 * Intelligent region selection based on request context
 */
export function selectOptimalRegion(request?: Request): TursoRegion {
  if (!request) return 'us-east' // Default primary region
  
  try {
    // Try to get country from Cloudflare headers
    const country = request.headers.get('CF-IPCountry') || 
                   request.headers.get('X-Vercel-IP-Country') ||
                   request.headers.get('CloudFront-Viewer-Country')
    
    if (country && COUNTRY_TO_REGION_MAP[country]) {
      return COUNTRY_TO_REGION_MAP[country]
    }
    
    // Fallback to timezone-based detection
    const timezone = request.headers.get('X-Timezone') || 
                    request.headers.get('CF-Timezone')
    
    if (timezone) {
      if (timezone.includes('America/')) return 'us-east'
      if (timezone.includes('Europe/') || timezone.includes('Africa/')) return 'eu-central'
      if (timezone.includes('Asia/') || timezone.includes('Pacific/')) return 'ap-southeast'
    }
    
    return 'us-east' // Default fallback
  } catch (error) {
    console.warn('Region selection failed, using default:', error)
    return 'us-east'
  }
}

/**
 * Smart read/write operation routing
 */
export class TursoReplicationManager {
  private regionHealth = new Map<TursoRegion, { 
    healthy: boolean; 
    latency: number; 
    lastCheck: number 
  }>()
  
  private healthCheckInterval = 300000 // 5 minutes
  
  constructor() {
    this.initializeHealthChecks()
  }
  
  /**
   * Route read operations to optimal region
   */
  public async routeReadOperation<T>(
    operation: (region: TursoRegion) => Promise<T>,
    request?: Request,
    options: {
      allowStale?: boolean // Allow reads from potentially stale replicas
      maxStaleSeconds?: number // Maximum staleness tolerance
    } = {}
  ): Promise<T> {
    const { allowStale = true, maxStaleSeconds = 30 } = options
    
    // Select optimal region
    const preferredRegion = selectOptimalRegion(request)
    
    // Check if preferred region is healthy
    const regionHealth = this.regionHealth.get(preferredRegion)
    const isHealthy = regionHealth?.healthy && 
                     regionHealth.latency < 1000 // <1s response time
    
    if (isHealthy || !allowStale) {
      try {
        return await operation(preferredRegion)
      } catch (error) {
        console.warn(`Read failed on preferred region ${preferredRegion}:`, error)
        // Fall through to try other regions
      }
    }
    
    // Try other healthy regions in order of preference
    const fallbackRegions = this.getHealthyRegions()
      .filter(region => region !== preferredRegion)
      .sort((a, b) => (this.regionHealth.get(a)?.latency || Infinity) - 
                      (this.regionHealth.get(b)?.latency || Infinity))
    
    for (const region of fallbackRegions) {
      try {
        return await operation(region)
      } catch (error) {
        console.warn(`Read failed on fallback region ${region}:`, error)
        continue
      }
    }
    
    // Final fallback to primary region
    return await operation('us-east')
  }
  
  /**
   * Route write operations always to primary region
   */
  public async routeWriteOperation<T>(
    operation: (region: TursoRegion) => Promise<T>
  ): Promise<T> {
    const primaryRegion = this.getPrimaryRegion()
    
    try {
      const result = await operation(primaryRegion)
      
      // Trigger replication sync (Turso handles this automatically)
      this.triggerReplicationSync()
      
      return result
    } catch (error) {
      console.error(`Write operation failed on primary region:`, error)
      throw error
    }
  }
  
  /**
   * Get the primary (write) region
   */
  private getPrimaryRegion(): TursoRegion {
    return Object.entries(TURSO_REGIONS)
      .find(([, config]) => config.isPrimary)?.[0] as TursoRegion || 'us-east'
  }
  
  /**
   * Get list of healthy regions
   */
  private getHealthyRegions(): TursoRegion[] {
    return Array.from(this.regionHealth.entries())
      .filter(([, health]) => health.healthy)
      .map(([region]) => region)
  }
  
  /**
   * Initialize health checks for all regions
   */
  private initializeHealthChecks() {
    // Initialize all regions as healthy
    Object.keys(TURSO_REGIONS).forEach(region => {
      this.regionHealth.set(region as TursoRegion, {
        healthy: true,
        latency: 0,
        lastCheck: 0
      })
    })
    
    // Start periodic health checks
    setInterval(() => this.checkRegionHealth(), this.healthCheckInterval)
    
    // Initial health check
    this.checkRegionHealth()
  }
  
  /**
   * Check health of all configured regions
   */
  private async checkRegionHealth() {
    const healthPromises = Object.keys(TURSO_REGIONS).map(async (region) => {
      const regionKey = region as TursoRegion
      
      try {
        const startTime = Date.now()
        const db = getDB(regionKey)
        await db.execute('SELECT 1')
        const latency = Date.now() - startTime
        
        this.regionHealth.set(regionKey, {
          healthy: true,
          latency,
          lastCheck: Date.now()
        })
        
        console.log(`✅ Region ${region} healthy: ${latency}ms`)
      } catch (error) {
        this.regionHealth.set(regionKey, {
          healthy: false,
          latency: Infinity,
          lastCheck: Date.now()
        })
        
        console.error(`❌ Region ${region} unhealthy:`, error)
      }
    })
    
    await Promise.allSettled(healthPromises)
  }
  
  /**
   * Trigger replication sync after writes
   * (Turso handles this automatically, but we can add custom logic)
   */
  private triggerReplicationSync() {
    // Turso automatically syncs changes to replicas
    // We could add custom sync verification here if needed
    console.log('📡 Replication sync triggered')
  }
  
  /**
   * Get replication status and performance metrics
   */
  public getReplicationStats() {
    const regionStats = Object.fromEntries(
      Array.from(this.regionHealth.entries()).map(([region, health]) => [
        region,
        {
          ...health,
          config: TURSO_REGIONS[region]
        }
      ])
    )
    
    return {
      regions: regionStats,
      primaryRegion: this.getPrimaryRegion(),
      healthyRegions: this.getHealthyRegions(),
      performance: getPerformanceStats(),
      timestamp: new Date().toISOString()
    }
  }
}

// Global replication manager instance
export const replicationManager = new TursoReplicationManager()

/**
 * Convenience functions for common operations
 */

// Smart read operation with region selection
export async function smartRead<T>(
  operation: (region: TursoRegion) => Promise<T>,
  request?: Request,
  options?: { allowStale?: boolean; maxStaleSeconds?: number }
): Promise<T> {
  return replicationManager.routeReadOperation(operation, request, options)
}

// Write operation always to primary
export async function smartWrite<T>(
  operation: (region: TursoRegion) => Promise<T>
): Promise<T> {
  return replicationManager.routeWriteOperation(operation)
}

// Multi-region deployment configuration for Turso CLI
export const DEPLOYMENT_CONFIG = {
  production: {
    primary: {
      region: 'us-east',
      database: 'pingtopass-prod',
      url: process.env.TURSO_DATABASE_URL_PROD
    },
    replicas: [
      {
        region: 'us-west',
        database: 'pingtopass-prod-west',
        syncFrom: 'pingtopass-prod'
      },
      {
        region: 'eu-central',
        database: 'pingtopass-prod-eu', 
        syncFrom: 'pingtopass-prod'
      },
      {
        region: 'ap-southeast',
        database: 'pingtopass-prod-ap',
        syncFrom: 'pingtopass-prod'
      }
    ]
  },
  development: {
    primary: {
      region: 'us-east',
      database: 'pingtopass-dev',
      url: process.env.TURSO_DATABASE_URL_DEV
    },
    replicas: [] // No replicas needed for development
  }
}

/**
 * Turso CLI commands for setting up replication
 */
export const SETUP_COMMANDS = [
  // Create primary database
  'turso db create pingtopass-prod --location=iad', // us-east (Virginia)
  
  // Create read replicas
  'turso db replicate pingtopass-prod --location=lax --name=pingtopass-prod-west', // us-west
  'turso db replicate pingtopass-prod --location=fra --name=pingtopass-prod-eu',   // eu-central
  'turso db replicate pingtopass-prod --location=sin --name=pingtopass-prod-ap',   // ap-southeast
  
  // Generate auth tokens for each region
  'turso db tokens create pingtopass-prod',
  'turso db tokens create pingtopass-prod-west',
  'turso db tokens create pingtopass-prod-eu',
  'turso db tokens create pingtopass-prod-ap'
]

/**
 * Environment variable template for .env
 */
export const ENV_TEMPLATE = `
# Turso Primary Database (US East - Virginia)
TURSO_DATABASE_URL=libsql://pingtopass-prod.turso.io
TURSO_AUTH_TOKEN=your-primary-token

# Turso Read Replicas
TURSO_DATABASE_URL_WEST=libsql://pingtopass-prod-west.turso.io
TURSO_AUTH_TOKEN_WEST=your-west-token

TURSO_DATABASE_URL_EU=libsql://pingtopass-prod-eu.turso.io  
TURSO_AUTH_TOKEN_EU=your-eu-token

TURSO_DATABASE_URL_AP=libsql://pingtopass-prod-ap.turso.io
TURSO_AUTH_TOKEN_AP=your-ap-token
`