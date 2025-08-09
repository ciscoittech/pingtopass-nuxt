<template>
  <AuthGuard>
    <div class="container mx-auto px-4 py-8">
      <StudySession 
        :exam-id="examId"
        :mode="mode"
        :show-timer="showTimer"
        :enable-keyboard-shortcuts="true"
        :auto-save="true"
        :resume-session="resumeSession"
      />
    </div>
  </AuthGuard>
</template>

<script setup lang="ts">
const route = useRoute();
const examId = computed(() => route.params.examId as string);
const mode = computed(() => (route.query.mode as string) || 'practice');
const showTimer = computed(() => route.query.timer !== 'false');
const resumeSession = computed(() => route.query.resume === 'true');
</script>