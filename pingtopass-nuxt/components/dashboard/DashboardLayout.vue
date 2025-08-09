<template>
  <v-app>
    <!-- Navigation Drawer -->
    <v-navigation-drawer
      v-model="drawer"
      :rail="rail"
      permanent
      :theme="currentTheme"
    >
      <v-list density="compact" nav>
        <!-- User Profile Section -->
        <v-list-item
          :prepend-avatar="user?.avatar || '/default-avatar.png'"
          :title="user?.displayName"
          :subtitle="`Level ${user?.level}`"
          class="pa-2"
        >
          <template v-slot:append>
            <v-btn
              variant="text"
              size="small"
              @click.stop="rail = !rail"
              icon="mdi-menu"
            />
          </template>
        </v-list-item>

        <v-divider />

        <!-- Navigation Items -->
        <v-list-item
          v-for="item in navigationItems"
          :key="item.title"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
          :value="item.value"
          color="primary"
          data-test="nav-item"
        />
      </v-list>

      <!-- Bottom Actions -->
      <template v-slot:append>
        <v-list density="compact" nav>
          <v-list-item
            @click="toggleTheme"
            :prepend-icon="currentTheme === 'dark' ? 'mdi-weather-sunny' : 'mdi-weather-night'"
            title="Toggle Theme"
            data-test="theme-toggle"
          />
          <v-list-item
            @click="logout"
            prepend-icon="mdi-logout"
            title="Logout"
            data-test="logout-btn"
          />
        </v-list>
      </template>
    </v-navigation-drawer>

    <!-- Main Content Area -->
    <v-main>
      <!-- Top App Bar -->
      <v-app-bar
        flat
        density="compact"
        :theme="currentTheme"
      >
        <template v-slot:prepend>
          <v-app-bar-nav-icon
            @click="drawer = !drawer"
            class="d-lg-none"
          />
        </template>

        <v-app-bar-title>
          {{ pageTitle }}
        </v-app-bar-title>

        <template v-slot:append>
          <!-- XP Progress -->
          <div class="d-flex align-center mr-4" data-test="xp-progress">
            <v-icon size="small" class="mr-1">mdi-star</v-icon>
            <span class="text-caption">
              {{ user?.currentXp || 0 }} / {{ nextLevelXp }} XP
            </span>
            <v-progress-linear
              :model-value="xpProgress"
              height="4"
              class="ml-2"
              style="width: 100px"
              color="amber"
            />
          </div>

          <!-- Streak Counter -->
          <v-chip
            v-if="user?.streak > 0"
            size="small"
            color="orange"
            variant="tonal"
            data-test="streak-counter"
          >
            <v-icon start size="small">mdi-fire</v-icon>
            {{ user.streak }} day streak
          </v-chip>

          <!-- Notifications -->
          <v-btn
            icon="mdi-bell"
            variant="text"
            size="small"
            class="ml-2"
            data-test="notifications-btn"
          >
            <v-badge
              v-if="unreadNotifications > 0"
              :content="unreadNotifications"
              color="error"
            >
              <v-icon>mdi-bell</v-icon>
            </v-badge>
          </v-btn>
        </template>
      </v-app-bar>

      <!-- Page Content with Loading States -->
      <v-container fluid class="pa-4">
        <v-fade-transition mode="out-in">
          <div v-if="loading" class="d-flex justify-center align-center" style="min-height: 400px">
            <v-progress-circular indeterminate color="primary" />
          </div>
          
          <div v-else-if="error" class="text-center pa-8" data-test="error-state">
            <v-icon size="64" color="error" class="mb-4">mdi-alert-circle</v-icon>
            <h3 class="text-h5 mb-2">Something went wrong</h3>
            <p class="text-body-2 mb-4">{{ error }}</p>
            <v-btn
              color="primary"
              @click="retry"
              data-test="retry-btn"
            >
              Retry
            </v-btn>
          </div>

          <slot v-else />
        </v-fade-transition>
      </v-container>
    </v-main>

    <!-- Daily Goal Floating Action -->
    <v-btn
      v-if="showDailyGoal && !goalCompleted"
      color="primary"
      icon
      size="large"
      position="fixed"
      location="bottom end"
      class="ma-4"
      @click="openDailyGoal"
      data-test="daily-goal-fab"
    >
      <v-icon>mdi-target</v-icon>
      <v-tooltip
        activator="parent"
        location="start"
      >
        Today's Goal: {{ dailyProgress }}%
      </v-tooltip>
    </v-btn>
  </v-app>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTheme } from 'vuetify';
import { useDashboardStore } from '~/stores/dashboard';
import { useAuthStore } from '~/stores/auth';

// Props
interface Props {
  pageTitle?: string;
  showDailyGoal?: boolean;
  loading?: boolean;
  error?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  pageTitle: 'Dashboard',
  showDailyGoal: true,
  loading: false,
  error: null
});

// Emits
const emit = defineEmits<{
  retry: [];
}>();

// Stores
const dashboardStore = useDashboardStore();
const authStore = useAuthStore();
const router = useRouter();
const theme = useTheme();

// State
const drawer = ref(true);
const rail = ref(false);

// Computed
const user = computed(() => dashboardStore.userProfile);
const currentTheme = computed(() => theme.global.name.value);
const nextLevelXp = computed(() => (user.value?.level || 1) * 1000);
const xpProgress = computed(() => {
  if (!user.value) return 0;
  return (user.value.currentXp / nextLevelXp.value) * 100;
});

const dailyProgress = computed(() => {
  const goal = dashboardStore.dailyGoal;
  if (!goal) return 0;
  
  const questionProgress = (goal.completedQuestions / goal.targetQuestions) * 50;
  const timeProgress = (goal.completedTime / goal.targetTime) * 50;
  
  return Math.min(100, Math.round(questionProgress + timeProgress));
});

const goalCompleted = computed(() => dashboardStore.dailyGoal?.isCompleted || false);
const unreadNotifications = computed(() => dashboardStore.unreadNotifications);

// Navigation items
const navigationItems = [
  { title: 'Dashboard', icon: 'mdi-view-dashboard', to: '/dashboard', value: 'dashboard' },
  { title: 'Browse Exams', icon: 'mdi-certificate', to: '/exams', value: 'exams' },
  { title: 'Study Mode', icon: 'mdi-book-open-variant', to: '/study', value: 'study' },
  { title: 'Practice Test', icon: 'mdi-clipboard-text', to: '/test', value: 'test' },
  { title: 'Progress', icon: 'mdi-chart-line', to: '/progress', value: 'progress' },
  { title: 'Settings', icon: 'mdi-cog', to: '/settings', value: 'settings' }
];

// Methods
const toggleTheme = () => {
  theme.global.name.value = theme.global.name.value === 'light' ? 'dark' : 'light';
  // Persist theme preference
  dashboardStore.updateThemePreference(theme.global.name.value);
};

const logout = async () => {
  await authStore.logout();
  router.push('/login');
};

const retry = () => {
  emit('retry');
};

const openDailyGoal = () => {
  router.push('/dashboard#daily-goal');
};

// Lifecycle
onMounted(async () => {
  // Load user profile and daily goal
  await dashboardStore.loadUserProfile();
  await dashboardStore.loadDailyGoal();
  
  // Apply saved theme preference
  if (user.value?.preferredTheme && user.value.preferredTheme !== 'system') {
    theme.global.name.value = user.value.preferredTheme;
  }
});
</script>

<style scoped>
:deep(.v-navigation-drawer__content) {
  display: flex;
  flex-direction: column;
}
</style>