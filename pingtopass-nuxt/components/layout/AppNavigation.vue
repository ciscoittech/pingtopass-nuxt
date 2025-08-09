<template>
  <nav class="p-4 mobile-responsive">
    <ul class="space-y-2">
      <li>
        <NuxtLink
          to="/dashboard"
          class="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-lg transition-colors"
          data-test="nav-dashboard"
        >
          <span class="mr-3">📊</span>
          Dashboard
        </NuxtLink>
      </li>
      <li>
        <NuxtLink
          to="/exams"
          class="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-lg transition-colors"
          data-test="nav-exams"
        >
          <span class="mr-3">📚</span>
          Exams
        </NuxtLink>
      </li>
      <li>
        <NuxtLink
          to="/study"
          class="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-lg transition-colors"
          data-test="nav-study"
        >
          <span class="mr-3">📖</span>
          Study
        </NuxtLink>
      </li>
      <li>
        <NuxtLink
          to="/progress"
          class="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-lg transition-colors"
          data-test="nav-progress"
        >
          <span class="mr-3">📈</span>
          Progress
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
// Basic AppNavigation implementation to pass initial tests
</script>