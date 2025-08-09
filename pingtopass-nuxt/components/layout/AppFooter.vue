<template>
  <footer class="bg-gray-900 text-gray-300 py-8">
    <div class="container mx-auto px-4">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
        <!-- Company Info -->
        <div class="col-span-1 md:col-span-2">
          <h3 class="text-xl font-bold text-white mb-4">PingToPass</h3>
          <p class="text-gray-400 mb-4">
            Master IT certifications with our comprehensive exam preparation platform.
          </p>
          <p class="text-sm text-gray-500">
            © {{ currentYear }} PingToPass. All rights reserved.
          </p>
        </div>
        
        <!-- Quick Links -->
        <div>
          <h3 class="text-lg font-semibold text-white mb-4">Links</h3>
          <ul class="space-y-2">
            <li>
              <NuxtLink
                to="/privacy"
                class="hover:text-white transition-colors"
                data-test="footer-privacy"
              >
                Privacy Policy
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                to="/terms"
                class="hover:text-white transition-colors"
                data-test="footer-terms"
              >
                Terms of Service
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                to="/contact"
                class="hover:text-white transition-colors"
                data-test="footer-contact"
              >
                Contact Us
              </NuxtLink>
            </li>
          </ul>
        </div>
        
        <!-- Newsletter & Social -->
        <div>
          <h3 class="text-lg font-semibold text-white mb-4">Stay Connected</h3>
          
          <!-- Newsletter Signup -->
          <div data-test="newsletter" class="mb-6">
            <p class="text-sm text-gray-400 mb-2">Subscribe to our newsletter</p>
            <div class="flex">
              <input
                type="email"
                placeholder="Enter email"
                class="flex-1 px-3 py-2 bg-gray-800 text-white rounded-l-lg focus:outline-none focus:bg-gray-700"
                data-test="newsletter-email"
              />
              <button
                class="px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 transition-colors"
                data-test="newsletter-submit"
              >
                Subscribe
              </button>
            </div>
          </div>
          
          <!-- Social Media -->
          <div data-test="social-media">
            <p class="text-sm text-gray-400 mb-2">Follow us</p>
            <div class="flex space-x-4">
              <a
                href="https://twitter.com/pingtopass"
                target="_blank"
                rel="noopener noreferrer"
                class="text-gray-400 hover:text-white transition-colors"
                data-test="social-twitter"
                aria-label="Follow us on Twitter"
              >
                🐦
              </a>
              <a
                href="https://linkedin.com/company/pingtopass"
                target="_blank"
                rel="noopener noreferrer"
                class="text-gray-400 hover:text-white transition-colors"
                data-test="social-linkedin"
                aria-label="Follow us on LinkedIn"
              >
                💼
              </a>
              <a
                href="https://github.com/pingtopass"
                target="_blank"
                rel="noopener noreferrer"
                class="text-gray-400 hover:text-white transition-colors"
                data-test="social-github"
                aria-label="Follow us on GitHub"
              >
                👾
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
// Basic AppFooter implementation to pass initial tests
const currentYear = new Date().getFullYear();
</script>