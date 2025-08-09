<template>
  <div class="dashboard-container">
    <!-- Sidebar Navigation -->
    <aside class="dashboard-sidebar">
      <div class="sidebar-header">
        <h2 class="sidebar-title">MAIN</h2>
      </div>
      
      <nav class="sidebar-nav">
        <NuxtLink to="/dashboard" class="nav-item active">
          <span>Dashboard</span>
        </NuxtLink>
        <NuxtLink to="/exams" class="nav-item">
          <span>Exams</span>
        </NuxtLink>
        <NuxtLink to="/study" class="nav-item">
          <span>Study Mode</span>
        </NuxtLink>
        <NuxtLink to="/test-mode" class="nav-item">
          <span>Test Mode</span>
        </NuxtLink>
      </nav>
    </aside>

    <!-- Main Content -->
    <main class="dashboard-main">
      <!-- Header -->
      <header class="dashboard-header">
        <h1 class="page-title">Good morning, {{ userName }}!</h1>
        <p class="xp-status">
          <span class="level-badge">Level {{ userLevel }}</span>
          <span class="xp-progress">{{ currentXP }}/{{ nextLevelXP }} XP</span>
        </p>
      </header>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card blue">
          <h3>Available Exams</h3>
          <p class="value">{{ availableExams }}</p>
        </div>
        <div class="stat-card green">
          <h3>Active Sessions</h3>
          <p class="value">{{ activeSessions }}</p>
        </div>
        <div class="stat-card yellow">
          <h3>Tests Completed</h3>
          <p class="value">{{ testsCompleted }}</p>
        </div>
      </div>

      <!-- Continue Learning Button -->
      <div class="action-section">
        <button class="btn-continue-learning" @click="navigateTo('/study')">
          Continue Learning →
        </button>
      </div>

      <!-- Featured Certifications -->
      <section class="certifications-section">
        <h2>Featured Certification Exams</h2>
        <div class="certification-cards">
          <div class="cert-card" v-for="cert in featuredCertifications" :key="cert.code">
            <h4>{{ cert.code }}</h4>
            <p class="cert-name">{{ cert.name }}</p>
            <p class="cert-description">{{ cert.description }}</p>
            <button class="btn-start">Start →</button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

// User data
const userName = ref('there');
const userLevel = ref(3);
const currentXP = ref(750);
const nextLevelXP = ref(1000);

// Stats
const availableExams = ref(12);
const activeSessions = ref(2);
const testsCompleted = ref(5);

// Featured certifications
const featuredCertifications = ref([
  {
    code: 'N10-008',
    name: 'CompTIA Network+',
    description: 'Network infrastructure knowledge.',
    questionCount: 65
  },
  {
    code: 'XK0-005',
    name: 'CompTIA Linux+',
    description: 'Linux system administration.',
    questionCount: 90
  },
  {
    code: 'SY0-701',
    name: 'CompTIA Security+',
    description: 'Core security functions.',
    questionCount: 90
  }
]);

// Navigation
const { push: navigateTo } = useRouter();
</script>

<style scoped>
.dashboard-container {
  display: flex;
  min-height: 100vh;
  background: #f8f9fa;
}

/* Sidebar */
.dashboard-sidebar {
  width: 240px;
  background: white;
  border-right: 1px solid #e0e0e0;
  padding: 1.5rem 0;
}

.sidebar-header {
  padding: 0 1.5rem 1rem;
}

.sidebar-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
}

.nav-item {
  display: block;
  padding: 0.75rem 1.5rem;
  color: #4b5563;
  text-decoration: none;
  transition: all 0.2s;
}

.nav-item:hover {
  background: #f3f4f6;
  color: #111827;
}

.nav-item.active {
  background: #eff6ff;
  color: #2563eb;
  font-weight: 500;
  border-left: 3px solid #2563eb;
}

/* Main Content */
.dashboard-main {
  flex: 1;
  padding: 2rem;
}

.dashboard-header {
  background: white;
  border-radius: 0.75rem;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.page-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.5rem;
}

.xp-status {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.level-badge {
  background: #fbbf24;
  color: #78350f;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 600;
}

.xp-progress {
  color: #6b7280;
  font-size: 0.875rem;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-left: 4px solid;
}

.stat-card.blue {
  border-left-color: #3b82f6;
}

.stat-card.green {
  border-left-color: #10b981;
}

.stat-card.yellow {
  border-left-color: #f59e0b;
}

.stat-card h3 {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
}

.stat-card .value {
  font-size: 1.875rem;
  font-weight: 700;
  color: #111827;
}

/* Action Section */
.action-section {
  margin-bottom: 2rem;
}

.btn-continue-learning {
  background: #2563eb;
  color: white;
  padding: 0.75rem 2rem;
  border-radius: 0.5rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-continue-learning:hover {
  background: #1d4ed8;
}

/* Certifications */
.certifications-section {
  background: white;
  border-radius: 0.75rem;
  padding: 2rem;
}

.certifications-section h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 1.5rem;
}

.certification-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.cert-card {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1.5rem;
}

.cert-card h4 {
  font-size: 1.125rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.25rem;
}

.cert-name {
  font-weight: 600;
  color: #4b5563;
  margin-bottom: 0.5rem;
}

.cert-description {
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.btn-start {
  background: #2563eb;
  color: white;
  padding: 0.5rem 1.5rem;
  border-radius: 0.375rem;
  border: none;
  font-weight: 500;
  cursor: pointer;
}

.btn-start:hover {
  background: #1d4ed8;
}

/* Responsive */
@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .certification-cards {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .dashboard-sidebar {
    display: none;
  }
  
  .dashboard-main {
    padding: 1rem;
  }
}
</style>