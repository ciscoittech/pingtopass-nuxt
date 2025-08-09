<template>
  <div class="spike-page-container">
    <!-- Hero Section -->
    <section class="spike-hero-section">
      <h1 class="spike-hero-title">Master IT Certifications with Confidence</h1>
      <p class="spike-hero-subtitle">
        AI-powered practice exams for CompTIA, Cisco, Microsoft & more.
        Join 50,000+ IT professionals passing their exams with PingToPass.
      </p>
      
      <!-- Feature Pills -->
      <div class="spike-feature-pills">
        <span class="spike-pill">✓ 10,000+ Real Exam Questions</span>
        <span class="spike-pill">✓ Adaptive AI Learning System</span>
        <span class="spike-pill">✓ 95% Pass Rate Guarantee</span>
      </div>
      
      <!-- CTA Buttons -->
      <div class="spike-button-group">
        <SpikeButton 
          variant="primary"
          size="lg"
          @click="navigateTo('/exams')"
        >
          Start Studying Free
        </SpikeButton>
        <SpikeButton 
          variant="outline"
          size="lg"
          @click="navigateTo('/login')"
        >
          View Demo
        </SpikeButton>
      </div>
      <p class="spike-hero-note">No credit card required • Free forever plan</p>
    </section>

    <!-- Statistics Bar -->
    <section class="spike-stats-bar">
      <div class="spike-stat">
        <div class="spike-stat-number">50,000+</div>
        <div class="spike-stat-label">Students Enrolled</div>
      </div>
      <div class="spike-stat">
        <div class="spike-stat-number">95%</div>
        <div class="spike-stat-label">Pass Rate</div>
      </div>
      <div class="spike-stat">
        <div class="spike-stat-number">25</div>
        <div class="spike-stat-label">Certifications</div>
      </div>
      <div class="spike-stat">
        <div class="spike-stat-number">10,000+</div>
        <div class="spike-stat-label">Questions</div>
      </div>
    </section>

    <!-- Features Grid -->
    <section class="spike-features-section">
      <h2 class="spike-section-title">Why Choose PingToPass?</h2>
      <div class="spike-features-grid">
        <SpikeCard variant="elevated" padding="lg" hoverable>
          <template #header>
            <div class="spike-feature-icon">🧠</div>
          </template>
          <h3 class="spike-feature-title">AI-Powered Learning</h3>
          <p class="spike-feature-description">
            Our AI adapts to your learning style, creating personalized study paths that maximize retention.
          </p>
        </SpikeCard>
        <SpikeCard variant="elevated" padding="lg" hoverable>
          <template #header>
            <div class="spike-feature-icon">📊</div>
          </template>
          <h3 class="spike-feature-title">Progress Analytics</h3>
          <p class="spike-feature-description">
            Track your performance with detailed analytics that identify and strengthen weak areas.
          </p>
        </SpikeCard>
        <SpikeCard variant="elevated" padding="lg" hoverable>
          <template #header>
            <div class="spike-feature-icon">🛡️</div>
          </template>
          <h3 class="spike-feature-title">Pass Guarantee</h3>
          <p class="spike-feature-description">
            We're so confident in our system, we guarantee you'll pass or get your money back.
          </p>
        </SpikeCard>
      </div>
    </section>

    <!-- Available Exams Preview -->
    <section class="spike-section">
      <h2 class="spike-section-title">Featured Certification Exams</h2>
      <ExamList :limit="6" />
    </section>

    <!-- User Dashboard Preview will be added later -->
  </div>
</template>

<script setup lang="ts">
// Page setup
</script>