<template>
  <div class="spike-legal-page">
    <div class="spike-legal-container">
      <div class="spike-legal-card">
        <h1 class="spike-legal-title">Privacy Policy</h1>
        
        <div class="spike-legal-content">
          <p class="spike-legal-date">Last updated: {{ formatDate(new Date()) }}</p>
          
          <h2 class="spike-legal-heading">1. Information We Collect</h2>
          
          <h3 class="spike-legal-subheading">Personal Information</h3>
          <p class="spike-legal-text">
            We collect information you provide directly to us, such as when you create an account, 
            use our services, or contact us for support:
          </p>
          <ul class="spike-legal-list">
            <li>Name and email address</li>
            <li>Account credentials</li>
            <li>Study progress and performance data</li>
            <li>Payment information (processed by third-party providers)</li>
          </ul>
          
          <h3 class="spike-legal-subheading">Usage Information</h3>
          <p class="spike-legal-text">
            We automatically collect certain information about your use of our Service:
          </p>
          <ul class="spike-legal-list">
            <li>Device information (browser type, operating system)</li>
            <li>Usage patterns and preferences</li>
            <li>Performance and error data</li>
          </ul>
          
          <h2 class="spike-legal-heading">2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul class="spike-legal-list">
            <li>Provide and maintain our Service</li>
            <li>Personalize your learning experience</li>
            <li>Process payments and manage subscriptions</li>
            <li>Send important updates and communications</li>
            <li>Improve our Service and develop new features</li>
            <li>Ensure security and prevent fraud</li>
          </ul>
          
          <h2 class="spike-legal-heading">3. Information Sharing</h2>
          <p class="spike-legal-text">
            We do not sell, trade, or rent your personal information to third parties. 
            We may share your information only in the following circumstances:
          </p>
          <ul class="spike-legal-list">
            <li><strong>Service Providers:</strong> With trusted third-party services that help us operate our platform</li>
            <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
            <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
          </ul>
          
          <h2 class="spike-legal-heading">4. Data Security</h2>
          <p class="spike-legal-text">
            We implement appropriate technical and organizational measures to protect your personal 
            information against unauthorized access, alteration, disclosure, or destruction. However, 
            no method of transmission over the Internet is 100% secure.
          </p>
          
          <h2 class="spike-legal-heading">5. Data Retention</h2>
          <p class="spike-legal-text">
            We retain your personal information for as long as your account is active or as needed 
            to provide you services. We will delete your information upon account closure, except 
            where we are required to retain it for legal purposes.
          </p>
          
          <h2 class="spike-legal-heading">6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul class="spike-legal-list">
            <li>Access and review your personal information</li>
            <li>Update or correct your information</li>
            <li>Delete your account and associated data</li>
            <li>Opt out of marketing communications</li>
            <li>Request a copy of your data</li>
          </ul>
          
          <h2 class="spike-legal-heading">7. Cookies and Tracking</h2>
          <p class="spike-legal-text">
            We use cookies and similar technologies to enhance your experience, analyze usage patterns, 
            and provide personalized content. You can control cookie settings through your browser preferences.
          </p>
          
          <h2 class="spike-legal-heading">8. Third-Party Services</h2>
          <p>Our Service may integrate with third-party services:</p>
          <ul class="spike-legal-list">
            <li><strong>Google OAuth:</strong> For authentication (governed by Google's Privacy Policy)</li>
            <li><strong>Stripe:</strong> For payment processing (governed by Stripe's Privacy Policy)</li>
            <li><strong>Analytics:</strong> For service improvement and performance monitoring</li>
          </ul>
          
          <h2 class="spike-legal-heading">9. Children's Privacy</h2>
          <p class="spike-legal-text">
            Our Service is not intended for children under 13. We do not knowingly collect personal 
            information from children under 13. If we become aware that we have collected such information, 
            we will delete it immediately.
          </p>
          
          <h2 class="spike-legal-heading">10. International Users</h2>
          <p class="spike-legal-text">
            If you are accessing our Service from outside the United States, please be aware that 
            your information may be transferred to, stored, and processed in the United States.
          </p>
          
          <h2 class="spike-legal-heading">11. Changes to This Policy</h2>
          <p class="spike-legal-text">
            We may update this Privacy Policy from time to time. We will notify you of any changes 
            by posting the new Privacy Policy on this page and updating the "Last updated" date.
          </p>
          
          <h2 class="spike-legal-heading">12. Contact Us</h2>
          <p class="spike-legal-text">
            If you have any questions about this Privacy Policy or our privacy practices, please contact us at:
          </p>
          <p class="spike-legal-text">
            Email: <a href="mailto:privacy@pingtopass.com" class="spike-legal-link">privacy@pingtopass.com</a><br>
            Subject: Privacy Policy Inquiry
          </p>
        </div>
        
        <div class="spike-legal-footer">
          <button
            class="spike-button spike-button-secondary"
            @click="navigateTo('/')"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// SEO metadata
useHead({
  title: 'Privacy Policy - PingToPass',
  meta: [
    { name: 'description', content: 'Privacy Policy for PingToPass IT certification exam platform. Learn how we protect and use your data.' },
    { name: 'robots', content: 'index, follow' }
  ]
})

// Helper function to format date
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>