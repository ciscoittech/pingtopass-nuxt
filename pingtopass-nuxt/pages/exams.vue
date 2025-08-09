<template>
  <div class="spike-exams-page">
    <div class="spike-exams-header">
      <h1 class="spike-exams-title">Available Certifications</h1>
      <p class="spike-exams-subtitle">Choose from our comprehensive library of IT certification practice exams</p>
    </div>
    
    <!-- Filters -->
    <div class="spike-exams-filters">
      <select 
        v-model="selectedVendor"
        class="spike-filter-select"
      >
        <option value="">All Vendors</option>
        <option value="cisco">Cisco</option>
        <option value="comptia">CompTIA</option>
        <option value="microsoft">Microsoft</option>
        <option value="aws">AWS</option>
      </select>
      
      <select 
        v-model="selectedLevel"
        class="spike-filter-select"
      >
        <option value="">All Levels</option>
        <option value="entry">Entry Level</option>
        <option value="associate">Associate</option>
        <option value="professional">Professional</option>
        <option value="expert">Expert</option>
      </select>
    </div>
    
    <!-- Exam List -->
    <div class="spike-exams-content">
      <ExamList 
        :vendor="selectedVendor"
        :level="selectedLevel"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const selectedVendor = ref('');
const selectedLevel = ref('');
</script>