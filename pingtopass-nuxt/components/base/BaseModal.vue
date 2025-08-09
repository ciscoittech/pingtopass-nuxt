<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        data-test="modal-overlay"
        class="fixed inset-0 z-50 overflow-y-auto"
        aria-hidden="true"
        @click="handleOverlayClick"
        @keydown.esc="handleEscKey"
      >
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>
        
        <!-- Modal positioning wrapper -->
        <div class="flex min-h-screen items-center justify-center p-4">
          <Transition
            enter-active-class="transition-all duration-300"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition-all duration-200"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-if="open"
              ref="modalRef"
              data-test="modal-content"
              :class="modalClasses"
              role="dialog"
              aria-modal="true"
              :aria-labelledby="title ? 'modal-title' : undefined"
              :aria-describedby="hasDefaultSlot ? 'modal-body' : undefined"
              tabindex="-1"
              @click.stop
            >
              <!-- Header -->
              <div v-if="title || $slots.header" class="flex items-center justify-between p-6 border-b border-gray-200">
                <div class="flex-1">
                  <slot name="header">
                    <h2 v-if="title" id="modal-title" class="text-lg font-semibold text-gray-900">
                      {{ title }}
                    </h2>
                  </slot>
                </div>
                
                <!-- Close button -->
                <button
                  type="button"
                  data-test="modal-close"
                  aria-label="Close modal"
                  @click="$emit('close', $event)"
                  class="ml-4 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                >
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <!-- Body -->
              <div 
                v-if="hasDefaultSlot"
                id="modal-body" 
                class="p-6"
                :class="{ 'border-b border-gray-200': $slots.footer }"
              >
                <slot />
              </div>

              <!-- Footer -->
              <div v-if="$slots.footer" class="px-6 py-4 bg-gray-50 rounded-b-lg">
                <slot name="footer" />
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';

// Props
interface Props {
  open?: boolean;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  persistent?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
  title: '',
  size: 'md',
  closeOnBackdrop: true,
  closeOnEsc: true,
  persistent: false,
});

// Emits
const emit = defineEmits<{
  close: [event: Event];
  opened: [void];
  closed: [void];
}>();

// Template ref
const modalRef = ref<HTMLElement>();

// Computed
const hasDefaultSlot = computed(() => {
  return !!$slots.default;
});

const modalClasses = computed(() => {
  const baseClasses = [
    'relative bg-white rounded-lg shadow-xl',
    'w-full mx-auto transform transition-all',
    'sm:align-middle'
  ];

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4'
  };

  return [
    ...baseClasses,
    sizeClasses[props.size]
  ];
});

// State for body scroll lock
let originalOverflow = '';

// Methods
const handleOverlayClick = (event: Event) => {
  if (props.closeOnBackdrop && !props.persistent) {
    emit('close', event);
  }
};

const handleEscKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.closeOnEsc && !props.persistent) {
    emit('close', event);
  }
};

const lockBodyScroll = () => {
  originalOverflow = document.body.style.overflow || '';
  document.body.style.overflow = 'hidden';
};

const unlockBodyScroll = () => {
  document.body.style.overflow = originalOverflow;
};

const focusModal = async () => {
  await nextTick();
  if (modalRef.value) {
    modalRef.value.focus();
  }
};

// Watchers
watch(() => props.open, async (newValue, oldValue) => {
  if (newValue && !oldValue) {
    // Modal is opening
    lockBodyScroll();
    await focusModal();
    emit('opened');
  } else if (!newValue && oldValue) {
    // Modal is closing
    unlockBodyScroll();
    emit('closed');
  }
});

// Lifecycle
onMounted(() => {
  if (props.open) {
    lockBodyScroll();
    focusModal();
  }
});

onUnmounted(() => {
  unlockBodyScroll();
});

// Global event listeners for ESC key
const handleGlobalKeydown = (event: KeyboardEvent) => {
  if (props.open) {
    handleEscKey(event);
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<style scoped>
/* Ensure modal appears above other elements */
.modal-overlay {
  z-index: 50;
}

/* Custom scrollbar for modal content if needed */
.modal-content::-webkit-scrollbar {
  width: 6px;
}

.modal-content::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.modal-content::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.modal-content::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Focus styles for accessibility */
.modal-content:focus {
  outline: 2px solid #3b82f6;
  outline-offset: -2px;
}

/* Animation improvements */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .modal-content {
    margin: 1rem;
    max-height: calc(100vh - 2rem);
    overflow-y: auto;
  }
}
</style>