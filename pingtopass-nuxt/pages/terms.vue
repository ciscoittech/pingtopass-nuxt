<template>
  <div class="spike-legal-page">
    <div class="spike-legal-container">
      <div class="spike-legal-card">
        <h1 class="spike-legal-title">Terms of Service</h1>
        
        <div class="spike-legal-content">
          <p class="spike-legal-date">Last updated: {{ formatDate(new Date()) }}</p>
          
          <h2 class="spike-legal-heading">1. Agreement to Terms</h2>
          <p class="spike-legal-text">
            By accessing and using PingToPass ("Service"), you accept and agree to be bound by 
            the terms and provision of this agreement.
          </p>
          
          <h2 class="spike-legal-heading">2. Description of Service</h2>
          <p class="spike-legal-text">
            PingToPass is an online platform that provides IT certification exam preparation 
            materials, practice tests, and study tools to help users prepare for various 
            IT certification examinations.
          </p>
          
          <h2 class="spike-legal-heading">3. User Accounts</h2>
          <p class="spike-legal-text">
            To access certain features of the Service, you may be required to create an account. 
            You are responsible for maintaining the confidentiality of your account credentials 
            and for all activities that occur under your account.
          </p>
          
          <h2 class="spike-legal-heading">4. Acceptable Use</h2>
          <p class="spike-legal-text">You agree not to:</p>
          <ul class="spike-legal-list">
            <li>Use the Service for any unlawful purpose or to solicit unlawful conduct</li>
            <li>Share, distribute, or resell our content without permission</li>
            <li>Attempt to gain unauthorized access to other user accounts or our systems</li>
            <li>Use automated tools to access the Service without permission</li>
          </ul>
          
          <h2 class="spike-legal-heading">5. Subscription and Billing</h2>
          <p class="spike-legal-text">
            Some features of the Service may require a paid subscription. Billing will be handled 
            through our payment processor, and charges will be made according to your selected plan.
          </p>
          
          <h2 class="spike-legal-heading">6. Intellectual Property</h2>
          <p class="spike-legal-text">
            All content, features, and functionality of the Service are owned by PingToPass 
            and are protected by copyright, trademark, and other intellectual property laws.
          </p>
          
          <h2 class="spike-legal-heading">7. Limitation of Liability</h2>
          <p class="spike-legal-text">
            PingToPass shall not be liable for any indirect, incidental, special, consequential, 
            or punitive damages resulting from your use of the Service.
          </p>
          
          <h2 class="spike-legal-heading">8. Changes to Terms</h2>
          <p class="spike-legal-text">
            We reserve the right to modify these terms at any time. Changes will be posted on 
            this page, and your continued use of the Service constitutes acceptance of the updated terms.
          </p>
          
          <h2 class="spike-legal-heading">9. Contact Information</h2>
          <p class="spike-legal-text">
            If you have any questions about these Terms of Service, please contact us at 
            <a href="mailto:support@pingtopass.com" class="spike-legal-link">support@pingtopass.com</a>.
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
  title: 'Terms of Service - PingToPass',
  meta: [
    { name: 'description', content: 'Terms of Service for PingToPass IT certification exam platform.' },
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