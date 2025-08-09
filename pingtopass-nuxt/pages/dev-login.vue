<template>
  <div class="dev-login-container">
    <div class="dev-login-card">
      <h1>Development Login</h1>
      <p class="warning">⚠️ This page is for development only and should be removed in production</p>
      
      <div class="user-options">
        <h2>Quick Login As:</h2>
        
        <button @click="loginAs('student')" class="dev-login-btn student">
          <span class="icon">👨‍🎓</span>
          <div>
            <strong>Test Student</strong>
            <small>student@test.com</small>
          </div>
        </button>
        
        <button @click="loginAs('premium')" class="dev-login-btn premium">
          <span class="icon">💎</span>
          <div>
            <strong>Premium User</strong>
            <small>premium@test.com</small>
          </div>
        </button>
        
        <button @click="loginAs('admin')" class="dev-login-btn admin">
          <span class="icon">🔧</span>
          <div>
            <strong>Admin User</strong>
            <small>admin@test.com</small>
          </div>
        </button>
      </div>
      
      <div class="divider">OR</div>
      
      <div class="custom-login">
        <h3>Custom User Details:</h3>
        <input v-model="customUser.email" type="email" placeholder="Email" />
        <input v-model="customUser.name" type="text" placeholder="Name" />
        <select v-model="customUser.role">
          <option value="student">Student</option>
          <option value="premium">Premium</option>
          <option value="admin">Admin</option>
        </select>
        <button @click="loginAsCustom" class="dev-login-btn custom">
          Login with Custom Details
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const customUser = ref({
  email: '',
  name: '',
  role: 'student'
});

const mockUsers = {
  student: {
    id: 'dev-student-001',
    email: 'student@test.com',
    name: 'Test Student',
    role: 'student',
    subscription: 'free',
    exams: ['comptia-network-plus', 'comptia-security-plus'],
    progress: {
      totalQuestions: 1250,
      correctAnswers: 875,
      studyStreak: 5,
      level: 3
    }
  },
  premium: {
    id: 'dev-premium-001',
    email: 'premium@test.com',
    name: 'Premium User',
    role: 'premium',
    subscription: 'premium',
    exams: ['comptia-network-plus', 'comptia-security-plus', 'cisco-ccna', 'aws-solutions-architect'],
    progress: {
      totalQuestions: 3500,
      correctAnswers: 2975,
      studyStreak: 15,
      level: 7
    }
  },
  admin: {
    id: 'dev-admin-001',
    email: 'admin@test.com',
    name: 'Admin User',
    role: 'admin',
    subscription: 'premium',
    isAdmin: true,
    exams: ['all'],
    progress: {
      totalQuestions: 10000,
      correctAnswers: 9500,
      studyStreak: 30,
      level: 10
    }
  }
};

async function loginAs(userType: 'student' | 'premium' | 'admin') {
  const user = mockUsers[userType];
  
  // Use the store's setUser method
  authStore.setUser(user);
  
  // Store in localStorage for persistence
  if (process.client) {
    localStorage.setItem('dev-auth-user', JSON.stringify(user));
    localStorage.setItem('dev-auth-token', `dev-token-${userType}-${Date.now()}`);
  }
  
  // Show success message
  console.log(`✅ Logged in as ${user.name} (${user.email})`);
  
  // Redirect to dashboard
  await router.push('/dashboard');
}

async function loginAsCustom() {
  if (!customUser.value.email || !customUser.value.name) {
    alert('Please fill in email and name');
    return;
  }
  
  const user = {
    id: `dev-custom-${Date.now()}`,
    email: customUser.value.email,
    name: customUser.value.name,
    role: customUser.value.role,
    subscription: customUser.value.role === 'admin' || customUser.value.role === 'premium' ? 'premium' : 'free',
    isAdmin: customUser.value.role === 'admin',
    exams: customUser.value.role === 'admin' ? ['all'] : ['comptia-network-plus'],
    progress: {
      totalQuestions: 0,
      correctAnswers: 0,
      studyStreak: 0,
      level: 1
    }
  };
  
  // Use the store's setUser method
  authStore.setUser(user);
  
  // Store in localStorage
  if (process.client) {
    localStorage.setItem('dev-auth-user', JSON.stringify(user));
    localStorage.setItem('dev-auth-token', `dev-token-custom-${Date.now()}`);
  }
  
  console.log(`✅ Logged in as ${user.name} (${user.email})`);
  
  // Redirect to dashboard
  await router.push('/dashboard');
}

// Auto-restore session on page load
onMounted(() => {
  if (process.client) {
    const savedUser = localStorage.getItem('dev-auth-user');
    const savedToken = localStorage.getItem('dev-auth-token');
    
    if (savedUser && savedToken) {
      try {
        const user = JSON.parse(savedUser);
        // Use the store's setUser method
        authStore.setUser(user);
        console.log(`🔄 Restored session for ${user.name}`);
      } catch (e) {
        console.error('Failed to restore dev session:', e);
      }
    }
  }
});
</script>

<style scoped>
.dev-login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.dev-login-card {
  background: white;
  border-radius: 12px;
  padding: 40px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 10px;
}

.warning {
  background: #fff3cd;
  color: #856404;
  padding: 10px;
  border-radius: 6px;
  text-align: center;
  margin-bottom: 30px;
  font-size: 14px;
}

.user-options h2 {
  font-size: 18px;
  margin-bottom: 20px;
  color: #555;
}

.dev-login-btn {
  width: 100%;
  padding: 15px;
  margin-bottom: 15px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 15px;
  transition: all 0.3s ease;
}

.dev-login-btn:hover {
  border-color: #667eea;
  background: #f8f9ff;
  transform: translateX(5px);
}

.dev-login-btn .icon {
  font-size: 32px;
}

.dev-login-btn div {
  text-align: left;
}

.dev-login-btn strong {
  display: block;
  color: #333;
  font-size: 16px;
}

.dev-login-btn small {
  color: #666;
  font-size: 12px;
}

.dev-login-btn.student:hover {
  border-color: #28a745;
  background: #f0fff4;
}

.dev-login-btn.premium:hover {
  border-color: #ffc107;
  background: #fffdf0;
}

.dev-login-btn.admin:hover {
  border-color: #dc3545;
  background: #fff5f5;
}

.divider {
  text-align: center;
  margin: 30px 0;
  color: #999;
  position: relative;
}

.divider::before,
.divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 45%;
  height: 1px;
  background: #e0e0e0;
}

.divider::before {
  left: 0;
}

.divider::after {
  right: 0;
}

.custom-login h3 {
  font-size: 16px;
  margin-bottom: 15px;
  color: #555;
}

.custom-login input,
.custom-login select {
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.custom-login input:focus,
.custom-login select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.dev-login-btn.custom {
  background: #667eea;
  color: white;
  border-color: #667eea;
  margin-top: 10px;
}

.dev-login-btn.custom:hover {
  background: #5a67d8;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
}
</style>