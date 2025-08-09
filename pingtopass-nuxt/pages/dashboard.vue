<template>
  <div class="dashboard-container">
    <!-- Sidebar Navigation -->
    <aside class="dashboard-sidebar">
      <div class="sidebar-header">
        <h2 class="sidebar-title">MAIN</h2>
      </div>
      
      <nav class="sidebar-nav">
        <NuxtLink to="/dashboard" class="nav-item active">
          <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>Dashboard</span>
        </NuxtLink>
        
        <NuxtLink to="/exams" class="nav-item">
          <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span>Exams</span>
        </NuxtLink>
        
        <NuxtLink to="/study" class="nav-item">
          <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Study Mode</span>
        </NuxtLink>
        
        <NuxtLink to="/test-mode" class="nav-item">
          <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          <span>Test Mode</span>
        </NuxtLink>
        
        <NuxtLink to="/profile" class="nav-item">
          <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>Profile</span>
        </NuxtLink>
      </nav>
      
      <div class="sidebar-section">
        <h3 class="section-title">GROWTH</h3>
        <NuxtLink to="/twitter" class="nav-item">
          <svg class="nav-icon" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
          </svg>
          <span>Twitter Growth</span>
          <span class="badge-new">NEW</span>
        </NuxtLink>
      </div>
      
      <div class="sidebar-section">
        <h3 class="section-title">ADMIN</h3>
        <NuxtLink to="/admin/dashboard" class="nav-item">
          <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>Admin Dashboard</span>
        </NuxtLink>
        
        <NuxtLink to="/admin/content" class="nav-item">
          <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span>Content Management</span>
        </NuxtLink>
        
        <NuxtLink to="/admin/question-generator" class="nav-item">
          <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Question Generator</span>
        </NuxtLink>
        
        <NuxtLink to="/admin/analytics" class="nav-item">
          <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span>System Analytics</span>
        </NuxtLink>
        
        <NuxtLink to="/admin/user-management" class="nav-item">
          <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span>User Management</span>
        </NuxtLink>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="dashboard-main">
      <!-- Header -->
      <header class="dashboard-header">
        <div class="header-content">
          <div>
            <h1 class="page-title">Good morning, {{ userName }}!</h1>
            <p class="xp-status">
              <span class="level-badge">Level {{ userLevel }}</span>
              <span class="xp-progress">{{ currentXP }}/{{ nextLevelXP }} XP</span>
            </p>
            <p class="study-progress">You have completed {{ completionPercentage }}% more studying this week</p>
          </div>
        </div>
      </header>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <StatsCard
          title="Available Exams"
          :value="availableExams"
          icon="book"
          color="blue"
          :loading="statsLoading"
        />
        <StatsCard
          title="Active Sessions"
          :value="activeSessions"
          icon="users"
          color="green"
          :loading="statsLoading"
        />
        <StatsCard
          title="Tests Completed"
          :value="testsCompleted"
          icon="check"
          color="yellow"
          :loading="statsLoading"
        />
      </div>

      <!-- Continue Learning Button -->
      <div class="action-section">
        <button class="btn-continue-learning" @click="navigateTo('/study')">
          Continue Learning →
        </button>
      </div>

      <!-- Explore Certifications -->
      <section class="certifications-section">
        <div class="section-header">
          <h2 class="section-title">Explore Our Certification Exams</h2>
          <p class="section-subtitle">
            Choose from our comprehensive collection of IT certification practice exams. 
            Master the skills you need to advance your career.
          </p>
          <NuxtLink to="/exams" class="browse-link">
            Browse All Exams
          </NuxtLink>
        </div>

        <!-- Featured Certifications -->
        <div class="section-subheader">
          <h3>Featured Certification Exams</h3>
          <span class="badge-available">5 Available</span>
        </div>

        <div class="certification-cards">
          <div class="cert-card" v-for="cert in featuredCertifications" :key="cert.code">
            <div class="cert-icon">
              <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div class="cert-content">
              <h4 class="cert-code">{{ cert.code }}</h4>
              <p class="cert-name">{{ cert.name }}</p>
              <p class="cert-description">{{ cert.description }}</p>
              <div class="cert-meta">
                <span class="question-count">{{ cert.questionCount }} questions</span>
              </div>
            </div>
            <button class="btn-start" @click="startExam(cert.code)">
              Start →
            </button>
          </div>
        </div>

        <!-- Additional sections -->
        <div class="additional-sections">
          <div class="section-card">
            <svg class="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3>Browse Exams</h3>
            <p>Explore certification exams</p>
          </div>
          
          <div class="section-card">
            <svg class="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3>Study Mode</h3>
            <p>Practice with study sessions</p>
          </div>
          
          <div class="section-card">
            <svg class="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <h3>Take a Practice Test</h3>
            <p>Test your knowledge</p>
          </div>
        </div>
      </section>

      <!-- Today's Goal Widget -->
      <aside class="goal-widget">
        <h3>Today's Goal</h3>
        <p class="goal-description">Questions to answer</p>
        <div class="goal-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: goalProgress + '%' }"></div>
          </div>
          <p class="goal-text">{{ questionsAnswered }} / {{ dailyGoal }} questions</p>
        </div>
        <p class="goal-status">{{ goalMessage }}</p>
        <button class="btn-start-now">Start Now</button>
      </aside>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import StatsCard from '~/components/dashboard/StatsCard.vue';

// User data
const userName = ref('there');
const userLevel = ref(3);
const currentXP = ref(0);
const nextLevelXP = ref(1000);
const completionPercentage = ref(0);

// Stats
const availableExams = ref(0);
const activeSessions = ref(0);
const testsCompleted = ref(0);
const statsLoading = ref(true);

// Featured certifications
const featuredCertifications = ref([
  {
    code: 'N10-008',
    name: 'CompTIA Network+',
    description: 'CompTIA Network+ validates the essential knowledge and skills needed to configure, maintain, and troubleshoot network infrastructure.',
    questionCount: 65
  },
  {
    code: 'XK0-005',
    name: 'CompTIA Linux+',
    description: 'CompTIA Linux+ validates the competencies required of an early career system administrator supporting Linux systems.',
    questionCount: 90
  },
  {
    code: 'SY0-701',
    name: 'CompTIA Security+',
    description: 'CompTIA Security+ is a global certification that validates the baseline skills necessary to perform core security functions.',
    questionCount: 90
  }
]);

// Daily goal
const dailyGoal = ref(10);
const questionsAnswered = ref(0);
const goalProgress = computed(() => {
  return Math.min(100, (questionsAnswered.value / dailyGoal.value) * 100);
});
const goalMessage = computed(() => {
  if (questionsAnswered.value >= dailyGoal.value) {
    return 'Goal completed! Great job!';
  }
  return `${dailyGoal.value - questionsAnswered.value} more questions to reach your goal`;
});

// Load dashboard data
onMounted(async () => {
  // Simulate loading for demo
  setTimeout(() => {
    // Use demo data for now
    userName.value = 'there';
    userLevel.value = 3;
    currentXP.value = 750;
    nextLevelXP.value = 1000;
    completionPercentage.value = 15;
    
    availableExams.value = 12;
    activeSessions.value = 2;
    testsCompleted.value = 5;
    
    questionsAnswered.value = 3;
    dailyGoal.value = 10;
    
    statsLoading.value = false;
  }, 500);
});

// Navigation
const navigateTo = useRouter().push;

const startExam = (code: string) => {
  navigateTo(`/exams/${code}`);
};
</script>

<style scoped>
.dashboard-container {
  display: flex;
  min-height: 100vh;
  background: #f8f9fa;
}

/* Sidebar Styles */
.dashboard-sidebar {
  width: 240px;
  background: white;
  border-right: 1px solid #e0e0e0;
  padding: 1.5rem 0;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 0 1.5rem 1rem;
}

.sidebar-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.sidebar-nav {
  margin-bottom: 2rem;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  color: #4b5563;
  text-decoration: none;
  transition: all 0.2s;
  position: relative;
}

.nav-item:hover {
  background: #f3f4f6;
  color: #111827;
}

.nav-item.active {
  background: #eff6ff;
  color: #2563eb;
  font-weight: 500;
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #2563eb;
}

.nav-icon {
  width: 20px;
  height: 20px;
  margin-right: 0.75rem;
}

.badge-new {
  margin-left: auto;
  background: #10b981;
  color: white;
  font-size: 0.625rem;
  padding: 0.125rem 0.375rem;
  border-radius: 9999px;
  font-weight: 600;
}

.sidebar-section {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.section-title {
  padding: 0 1.5rem 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* Main Content */
.dashboard-main {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
}

.dashboard-header {
  background: white;
  border-radius: 0.75rem;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  margin-bottom: 0.5rem;
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

.study-progress {
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

/* Certifications Section */
.certifications-section {
  background: white;
  border-radius: 0.75rem;
  padding: 2rem;
  margin-bottom: 2rem;
}

.section-header {
  text-align: center;
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.5rem;
}

.section-subtitle {
  color: #6b7280;
  margin-bottom: 1rem;
}

.browse-link {
  color: #2563eb;
  text-decoration: none;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.section-subheader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-subheader h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
}

.badge-available {
  background: #eff6ff;
  color: #2563eb;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
}

/* Certification Cards */
.certification-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.cert-card {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: all 0.2s;
}

.cert-card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.cert-icon {
  width: 40px;
  height: 40px;
  background: #eff6ff;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cert-icon .icon {
  width: 24px;
  height: 24px;
  color: #2563eb;
}

.cert-content {
  flex: 1;
}

.cert-code {
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
  line-height: 1.5;
  margin-bottom: 0.75rem;
}

.cert-meta {
  display: flex;
  gap: 1rem;
}

.question-count {
  color: #6b7280;
  font-size: 0.875rem;
}

.btn-start {
  align-self: flex-start;
  background: #2563eb;
  color: white;
  padding: 0.5rem 1.5rem;
  border-radius: 0.375rem;
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-start:hover {
  background: #1d4ed8;
}

/* Additional Sections */
.additional-sections {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.section-card {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.section-card:hover {
  background: #f9fafb;
}

.section-icon {
  width: 32px;
  height: 32px;
  color: #6b7280;
  margin: 0 auto 0.75rem;
}

.section-card h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.25rem;
}

.section-card p {
  color: #6b7280;
  font-size: 0.875rem;
}

/* Goal Widget */
.goal-widget {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 280px;
  border: 1px solid #e5e7eb;
}

.goal-widget h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.5rem;
}

.goal-description {
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.goal-progress {
  margin-bottom: 1rem;
}

.progress-bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 9999px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: #10b981;
  transition: width 0.3s ease;
}

.goal-text {
  color: #4b5563;
  font-size: 0.875rem;
  text-align: center;
}

.goal-status {
  color: #6b7280;
  font-size: 0.75rem;
  text-align: center;
  margin-bottom: 1rem;
}

.btn-start-now {
  width: 100%;
  background: #2563eb;
  color: white;
  padding: 0.5rem;
  border-radius: 0.375rem;
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-start-now:hover {
  background: #1d4ed8;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .certification-cards {
    grid-template-columns: 1fr;
  }
  
  .additional-sections {
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
  
  .header-illustration {
    display: none;
  }
  
  .goal-widget {
    position: static;
    width: 100%;
    margin-top: 2rem;
  }
}
</style>