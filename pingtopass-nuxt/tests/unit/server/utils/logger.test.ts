/**
 * Unit tests for Logger Utility
 * Critical path: Structured logging and error tracking
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger, Logger, LogLevel, PerformanceTimer } from '../../../../server/utils/logger'

// Mock console methods
const mockConsole = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn()
}

vi.stubGlobal('console', mockConsole)

describe('Logger Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NODE_ENV = 'test'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Logger Class', () => {
    it('should create logger with default context', () => {
      const testLogger = new Logger()
      expect(testLogger).toBeDefined()
      expect(testLogger).toBeInstanceOf(Logger)
    })

    it('should create logger with custom context', () => {
      const customContext = { userId: 'test-user', sessionId: 'test-session' }
      const testLogger = logger.withContext(customContext)
      
      expect(testLogger).toBeDefined()
      expect(testLogger).toBeInstanceOf(Logger)
    })

    it('should log info messages correctly', () => {
      const testLogger = new Logger()
      testLogger.info('Test message', { test: true })
      
      expect(mockConsole.info).toHaveBeenCalledOnce()
      const logCall = mockConsole.info.mock.calls[0][0]
      const logEntry = JSON.parse(logCall)
      
      expect(logEntry.level).toBe('info')
      expect(logEntry.message).toBe('Test message')
      expect(logEntry.context).toBeDefined()
    })

    it('should log errors with stack trace in development', () => {
      process.env.NODE_ENV = 'development'
      const testLogger = new Logger()
      const testError = new Error('Test error')
      
      testLogger.error('Error occurred', testError)
      
      expect(mockConsole.error).toHaveBeenCalledOnce()
      const logCall = mockConsole.error.mock.calls[0][0]
      const logEntry = JSON.parse(logCall)
      
      expect(logEntry.level).toBe('error')
      expect(logEntry.message).toBe('Error occurred')
      expect(logEntry.error).toBeDefined()
      expect(logEntry.error.message).toBe('Test error')
      expect(logEntry.error.stack).toBeDefined()
    })

    it('should not include stack trace in production', () => {
      process.env.NODE_ENV = 'production'
      const testLogger = new Logger()
      const testError = new Error('Test error')
      
      testLogger.error('Error occurred', testError)
      
      const logCall = mockConsole.error.mock.calls[0][0]
      const logEntry = JSON.parse(logCall)
      
      expect(logEntry.error.stack).toBeUndefined()
    })

    it('should log performance metrics', () => {
      const testLogger = new Logger()
      const metrics = {
        duration: 150,
        memoryUsage: 1024,
        dbQueryCount: 3
      }
      
      testLogger.performance('Request completed', metrics)
      
      expect(mockConsole.info).toHaveBeenCalledOnce()
      const logCall = mockConsole.info.mock.calls[0][0]
      const logEntry = JSON.parse(logCall)
      
      expect(logEntry.performance).toEqual(metrics)
    })

    it('should extract request context from H3 event', () => {
      const mockEvent = createMockEvent({
        node: {
          req: {
            method: 'POST',
            url: '/api/test',
            headers: {
              'user-agent': 'test-agent',
              'cf-ray': 'test-ray-id'
            }
          }
        }
      })

      const context = Logger.extractRequestContext(mockEvent)
      
      expect(context).toBeDefined()
      expect(context.method).toBe('POST')
      expect(context.path).toBe('/test')
      expect(context.traceId).toBe('test-ray-id')
      expect(context.userAgent).toBe('test-agent')
    })
  })

  describe('LogLevel Enum', () => {
    it('should have all required log levels', () => {
      expect(LogLevel.DEBUG).toBe('debug')
      expect(LogLevel.INFO).toBe('info')
      expect(LogLevel.WARN).toBe('warn')
      expect(LogLevel.ERROR).toBe('error')
      expect(LogLevel.CRITICAL).toBe('critical')
    })
  })

  describe('PerformanceTimer', () => {
    it('should measure duration correctly', () => {
      const timer = new PerformanceTimer()
      expect(timer).toBeDefined()
      
      const duration = timer.getDuration()
      expect(duration).toBeGreaterThanOrEqual(0)
    })

    it('should mark and measure specific points', () => {
      const timer = new PerformanceTimer()
      
      timer.mark('start')
      timer.mark('end')
      
      const duration = timer.getMarkDuration('start', 'end')
      expect(duration).toBeGreaterThanOrEqual(0)
    })

    it('should get performance metrics', () => {
      const timer = new PerformanceTimer()
      const metrics = timer.getMetrics()
      
      expect(metrics).toBeDefined()
      expect(metrics.duration).toBeGreaterThanOrEqual(0)
      expect(typeof metrics.duration).toBe('number')
    })
  })

  describe('Default Logger Instance', () => {
    it('should provide default logger instance', () => {
      expect(logger).toBeDefined()
      expect(logger).toBeInstanceOf(Logger)
    })

    it('should log different levels correctly', () => {
      logger.debug('Debug message')
      logger.info('Info message')
      logger.warn('Warning message')
      logger.error('Error message')
      logger.critical('Critical message')

      // Debug might not be called in test environment
      expect(mockConsole.info).toHaveBeenCalled()
      expect(mockConsole.warn).toHaveBeenCalled()
      expect(mockConsole.error).toHaveBeenCalledTimes(2) // error + critical
    })
  })
})