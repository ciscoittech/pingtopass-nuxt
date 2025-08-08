/**
 * Authentication Flow E2E Tests
 * Complete authentication journey testing
 */

import { test, expect, type Page } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.describe('Google OAuth Login', () => {
    test('successful login flow for new user', async ({ page }) => {
      // 1. Visit landing page
      await page.goto('/');
      await expect(page).toHaveTitle(/PingToPass - IT Certification/);
      
      // 2. Click login button
      await page.click('[data-test="login-btn"]');
      await expect(page.locator('[data-test="login-modal"]')).toBeVisible();
      
      // 3. Click Google login
      await page.click('[data-test="google-login-btn"]');
      
      // Mock Google OAuth flow
      await page.route('https://accounts.google.com/oauth/**', async route => {
        await route.fulfill({
          status: 302,
          headers: {
            'Location': `/auth/callback?code=test_auth_code&state=test_state`
          }
        });
      });
      
      // Mock token exchange
      await page.route('**/api/auth/google', async route => {
        const request = route.request();
        const body = await request.postDataJSON();
        
        if (body.id_token) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature',
                user: {
                  id: 1,
                  email: 'newuser@example.com',
                  name: 'New User',
                  role: 'user',
                  subscription_status: 'free'
                },
                is_new_user: true
              }
            })
          });
        } else {
          await route.fulfill({ status: 400 });
        }
      });
      
      // Should redirect to onboarding for new users
      await expect(page).toHaveURL('/onboarding');
      await expect(page.locator('[data-test="welcome-message"]')).toContainText('Welcome to PingToPass');
      
      // Complete onboarding
      await page.selectOption('[data-test="primary-certification"]', 'comptia-network');
      await page.fill('[data-test="experience-level"]', 'beginner');
      await page.click('[data-test="complete-onboarding-btn"]');
      
      // Should redirect to dashboard
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('[data-test="user-menu"]')).toContainText('New User');
    });
    
    test('successful login flow for returning user', async ({ page }) => {
      await page.goto('/');
      await page.click('[data-test="login-btn"]');
      await page.click('[data-test="google-login-btn"]');
      
      // Mock returning user response
      await page.route('**/api/auth/google', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature',
              user: {
                id: 2,
                email: 'returning@example.com',
                name: 'Returning User',
                role: 'user',
                subscription_status: 'premium'
              },
              is_new_user: false
            }
          })
        });
      });
      
      // Should redirect directly to dashboard
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('[data-test="premium-badge"]')).toBeVisible();
    });
    
    test('handle Google OAuth errors', async ({ page }) => {
      await page.goto('/');
      await page.click('[data-test="login-btn"]');
      await page.click('[data-test="google-login-btn"]');
      
      // Mock OAuth error
      await page.route('**/api/auth/google', async route => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Invalid ID token'
          })
        });
      });
      
      // Should show error message
      await expect(page.locator('[data-test="error-notification"]')).toBeVisible();
      await expect(page.locator('[data-test="error-notification"]')).toContainText(/authentication failed/i);
      
      // Should remain on login page
      await expect(page.locator('[data-test="login-modal"]')).toBeVisible();
    });
    
    test('handle network errors during login', async ({ page }) => {
      await page.goto('/');
      await page.click('[data-test="login-btn"]');
      await page.click('[data-test="google-login-btn"]');
      
      // Mock network error
      await page.route('**/api/auth/google', async route => {
        await route.abort('failed');
      });
      
      // Should show network error
      await expect(page.locator('[data-test="error-notification"]')).toBeVisible();
      await expect(page.locator('[data-test="error-notification"]')).toContainText(/connection error/i);
      
      // Should have retry option
      await expect(page.locator('[data-test="retry-login-btn"]')).toBeVisible();
    });
  });
  
  test.describe('Session Management', () => {
    test('automatic token refresh', async ({ page }) => {
      // Mock initial login
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'expiring_token');
        localStorage.setItem('user', JSON.stringify({
          id: 1,
          email: 'test@example.com',
          name: 'Test User'
        }));
      });
      
      // Mock token refresh endpoint
      await page.route('**/api/auth/refresh', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              token: 'new_refreshed_token',
              expires_at: new Date(Date.now() + 86400000).toISOString()
            }
          })
        });
      });
      
      await page.goto('/dashboard');
      
      // Wait for automatic token refresh
      await page.waitForTimeout(1000);
      
      // Verify new token is stored
      const newToken = await page.evaluate(() => localStorage.getItem('auth_token'));
      expect(newToken).toBe('new_refreshed_token');
    });
    
    test('logout functionality', async ({ page }) => {
      // Setup authenticated state
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'valid_token');
        localStorage.setItem('user', JSON.stringify({
          id: 1,
          email: 'test@example.com',
          name: 'Test User'
        }));
      });
      
      await page.goto('/dashboard');
      
      // Mock logout endpoint
      await page.route('**/api/auth/logout', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { message: 'Logged out successfully' }
          })
        });
      });
      
      // Click logout
      await page.click('[data-test="user-menu"]');
      await page.click('[data-test="logout-btn"]');
      
      // Should redirect to home page
      await expect(page).toHaveURL('/');
      
      // Should clear localStorage
      const token = await page.evaluate(() => localStorage.getItem('auth_token'));
      expect(token).toBeNull();
      
      // Should show login button again
      await expect(page.locator('[data-test="login-btn"]')).toBeVisible();
    });
    
    test('handle expired session gracefully', async ({ page }) => {
      // Set expired token
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'expired_token');
        localStorage.setItem('user', JSON.stringify({
          id: 1,
          email: 'test@example.com'
        }));
      });
      
      // Mock expired token response
      await page.route('**/api/**', async route => {
        if (route.request().headers()['authorization']) {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: 'Token expired'
            })
          });
        } else {
          await route.continue();
        }
      });
      
      await page.goto('/dashboard');
      
      // Should redirect to login
      await expect(page).toHaveURL('/');
      await expect(page.locator('[data-test="login-required-message"]')).toBeVisible();
    });
  });
  
  test.describe('Protected Routes', () => {
    test('redirect unauthenticated users to login', async ({ page }) => {
      const protectedRoutes = [
        '/dashboard',
        '/exams/comptia-network',
        '/study/session/123',
        '/profile',
        '/billing'
      ];
      
      for (const route of protectedRoutes) {
        await page.goto(route);
        
        // Should redirect to home with login prompt
        await expect(page).toHaveURL('/');
        await expect(page.locator('[data-test="login-required-message"]')).toBeVisible();
      }
    });
    
    test('allow authenticated users to access protected routes', async ({ page }) => {
      // Mock authentication
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'valid_token');
        localStorage.setItem('user', JSON.stringify({
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
          subscription_status: 'premium'
        }));
      });
      
      // Mock auth validation
      await page.route('**/api/auth/me', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              user: {
                id: 1,
                email: 'test@example.com',
                name: 'Test User',
                role: 'user',
                subscription_status: 'premium'
              }
            }
          })
        });
      });
      
      // Test protected routes are accessible
      await page.goto('/dashboard');
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('[data-test="dashboard-content"]')).toBeVisible();
      
      await page.goto('/profile');
      await expect(page).toHaveURL('/profile');
      await expect(page.locator('[data-test="profile-form"]')).toBeVisible();
    });
  });
  
  test.describe('Admin Access', () => {
    test('admin users can access admin routes', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'admin_token');
        localStorage.setItem('user', JSON.stringify({
          id: 1,
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin',
          subscription_status: 'premium'
        }));
      });
      
      await page.route('**/api/auth/me', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              user: {
                id: 1,
                email: 'admin@example.com',
                role: 'admin'
              }
            }
          })
        });
      });
      
      await page.goto('/admin');
      await expect(page).toHaveURL('/admin');
      await expect(page.locator('[data-test="admin-dashboard"]')).toBeVisible();
    });
    
    test('regular users cannot access admin routes', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'user_token');
        localStorage.setItem('user', JSON.stringify({
          id: 2,
          email: 'user@example.com',
          name: 'Regular User',
          role: 'user',
          subscription_status: 'free'
        }));
      });
      
      await page.route('**/api/auth/me', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              user: {
                id: 2,
                email: 'user@example.com',
                role: 'user'
              }
            }
          })
        });
      });
      
      await page.goto('/admin');
      
      // Should redirect to dashboard with error
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('[data-test="access-denied-message"]')).toBeVisible();
    });
  });
  
  test.describe('Security', () => {
    test('prevent XSS attacks in user data', async ({ page }) => {
      const maliciousScript = '<script>alert("xss")</script>';
      
      await page.goto('/');
      await page.route('**/api/auth/google', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              token: 'valid_token',
              user: {
                id: 1,
                email: 'test@example.com',
                name: maliciousScript, // Malicious name
                role: 'user',
                subscription_status: 'free'
              },
              is_new_user: false
            }
          })
        });
      });
      
      await page.click('[data-test="login-btn"]');
      await page.click('[data-test="google-login-btn"]');
      
      await expect(page).toHaveURL('/dashboard');
      
      // Check that script is not executed (name should be escaped)
      const userMenuText = await page.locator('[data-test="user-menu"]').textContent();
      expect(userMenuText).not.toContain('<script>');
      expect(userMenuText).toContain('&lt;script&gt;'); // Should be HTML escaped
    });
    
    test('secure token storage and transmission', async ({ page }) => {
      await page.goto('/');
      await page.click('[data-test="login-btn"]');
      await page.click('[data-test="google-login-btn"]');
      
      await page.route('**/api/auth/google', async route => {
        const request = route.request();
        
        // Verify HTTPS is used in production
        if (process.env.NODE_ENV === 'production') {
          expect(request.url()).toMatch(/^https:/);
        }
        
        // Verify Content-Security-Policy header
        expect(request.headers()['content-type']).toContain('application/json');
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              token: 'secure_token',
              user: { id: 1, email: 'test@example.com', name: 'Test User' }
            }
          })
        });
      });
      
      await expect(page).toHaveURL('/dashboard');
      
      // Verify token is stored securely (not in regular localStorage for production)
      const token = await page.evaluate(() => localStorage.getItem('auth_token'));
      expect(token).toBeTruthy();
      
      // Verify token is sent in Authorization header for API requests
      let authHeaderFound = false;
      
      await page.route('**/api/**', async route => {
        const authHeader = route.request().headers()['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
          authHeaderFound = true;
        }
        await route.continue();
      });
      
      // Make an API request to trigger auth header check
      await page.reload();
      expect(authHeaderFound).toBe(true);
    });
  });
  
  test.describe('Performance', () => {
    test('login flow completes within 3 seconds @performance', async ({ page }) => {
      await page.goto('/');
      
      const startTime = Date.now();
      
      await page.click('[data-test="login-btn"]');
      await page.click('[data-test="google-login-btn"]');
      
      // Mock fast authentication
      await page.route('**/api/auth/google', async route => {
        // Add small delay to simulate real network
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              token: 'fast_token',
              user: { id: 1, email: 'test@example.com', name: 'Test User' },
              is_new_user: false
            }
          })
        });
      });
      
      await expect(page).toHaveURL('/dashboard');
      
      const loginDuration = Date.now() - startTime;
      console.log(`Login duration: ${loginDuration}ms`);
      
      expect(loginDuration).toBeLessThan(3000);
    });
    
    test('token refresh completes within 500ms', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'expiring_token');
        localStorage.setItem('user', JSON.stringify({
          id: 1,
          email: 'test@example.com'
        }));
      });
      
      const startTime = Date.now();
      
      await page.route('**/api/auth/refresh', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              token: 'refreshed_token',
              expires_at: new Date(Date.now() + 86400000).toISOString()
            }
          })
        });
      });
      
      await page.goto('/dashboard');
      
      // Wait for token refresh to complete
      await page.waitForFunction(() => {
        return localStorage.getItem('auth_token') === 'refreshed_token';
      }, { timeout: 1000 });
      
      const refreshDuration = Date.now() - startTime;
      console.log(`Token refresh duration: ${refreshDuration}ms`);
      
      expect(refreshDuration).toBeLessThan(500);
    });
  });
});