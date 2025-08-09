# Spike Theme CSS Implementation Guide

## Implementation Order & File Structure

### Step 1: Create Design Token Files

#### 1.1 Color Tokens
```css
/* assets/css/spike-theme/tokens/_colors.css */
:root {
  /* Brand Colors */
  --spike-primary-hue: 204;
  --spike-primary-saturation: 100%;
  --spike-primary-lightness: 43%;
  
  /* Primary Palette - Using HSL for easy variations */
  --spike-primary: hsl(var(--spike-primary-hue), var(--spike-primary-saturation), var(--spike-primary-lightness));
  --spike-primary-hover: hsl(var(--spike-primary-hue), var(--spike-primary-saturation), calc(var(--spike-primary-lightness) - 5%));
  --spike-primary-active: hsl(var(--spike-primary-hue), var(--spike-primary-saturation), calc(var(--spike-primary-lightness) - 10%));
  --spike-primary-light: hsl(var(--spike-primary-hue), var(--spike-primary-saturation), 95%);
  
  /* Semantic Colors */
  --spike-info: #46caeb;
  --spike-info-light: #e3f7fc;
  --spike-info-dark: #0e7490;
  
  --spike-success: #28a745;
  --spike-success-light: #d4edda;
  --spike-success-dark: #155724;
  
  --spike-warning: #ffc107;
  --spike-warning-light: #fff3cd;
  --spike-warning-dark: #856404;
  
  --spike-error: #dc3545;
  --spike-error-light: #f8d7da;
  --spike-error-dark: #721c24;
  
  /* Neutral Palette */
  --spike-white: #ffffff;
  --spike-gray-50: #f8f9fa;
  --spike-gray-100: #f1f3f5;
  --spike-gray-200: #e9ecef;
  --spike-gray-300: #dee2e6;
  --spike-gray-400: #ced4da;
  --spike-gray-500: #adb5bd;
  --spike-gray-600: #6c757d;
  --spike-gray-700: #495057;
  --spike-gray-800: #343a40;
  --spike-gray-900: #212529;
  --spike-black: #000000;
  
  /* Contextual Mappings */
  --spike-background: var(--spike-gray-50);
  --spike-surface: var(--spike-white);
  --spike-surface-variant: var(--spike-gray-100);
  --spike-border: var(--spike-gray-300);
  --spike-border-light: var(--spike-gray-200);
  --spike-border-dark: var(--spike-gray-400);
  
  /* Text Colors */
  --spike-text: var(--spike-gray-900);
  --spike-text-secondary: var(--spike-gray-600);
  --spike-text-muted: var(--spike-gray-500);
  --spike-text-disabled: var(--spike-gray-400);
  --spike-text-inverse: var(--spike-white);
  
  /* Interactive States */
  --spike-hover-overlay: rgba(0, 0, 0, 0.04);
  --spike-focus-ring: rgba(0, 133, 219, 0.25);
  --spike-disabled-opacity: 0.5;
}
```

#### 1.2 Typography Tokens
```css
/* assets/css/spike-theme/tokens/_typography.css */
:root {
  /* Font Families */
  --spike-font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --spike-font-mono: 'Fira Code', 'SF Mono', Monaco, 'Inconsolata', 'Courier New', monospace;
  
  /* Font Sizes - Using rem for accessibility */
  --spike-text-xs: 0.75rem;    /* 12px */
  --spike-text-sm: 0.875rem;   /* 14px */
  --spike-text-base: 1rem;     /* 16px */
  --spike-text-lg: 1.125rem;   /* 18px */
  --spike-text-xl: 1.25rem;    /* 20px */
  --spike-text-2xl: 1.5rem;    /* 24px */
  --spike-text-3xl: 1.875rem;  /* 30px */
  --spike-text-4xl: 2.25rem;   /* 36px */
  --spike-text-5xl: 3rem;      /* 48px */
  --spike-text-6xl: 3.75rem;   /* 60px */
  
  /* Font Weights */
  --spike-font-normal: 400;
  --spike-font-medium: 500;
  --spike-font-semibold: 600;
  --spike-font-bold: 700;
  --spike-font-extrabold: 800;
  
  /* Line Heights */
  --spike-leading-none: 1;
  --spike-leading-tight: 1.25;
  --spike-leading-snug: 1.375;
  --spike-leading-normal: 1.5;
  --spike-leading-relaxed: 1.625;
  --spike-leading-loose: 2;
  
  /* Letter Spacing */
  --spike-tracking-tighter: -0.05em;
  --spike-tracking-tight: -0.025em;
  --spike-tracking-normal: 0;
  --spike-tracking-wide: 0.025em;
  --spike-tracking-wider: 0.05em;
  --spike-tracking-widest: 0.1em;
}
```

#### 1.3 Spacing Tokens
```css
/* assets/css/spike-theme/tokens/_spacing.css */
:root {
  /* Spacing Scale - Based on 4px grid */
  --spike-space-0: 0;
  --spike-space-px: 1px;
  --spike-space-0-5: 0.125rem;  /* 2px */
  --spike-space-1: 0.25rem;     /* 4px */
  --spike-space-1-5: 0.375rem;  /* 6px */
  --spike-space-2: 0.5rem;      /* 8px */
  --spike-space-2-5: 0.625rem;  /* 10px */
  --spike-space-3: 0.75rem;     /* 12px */
  --spike-space-3-5: 0.875rem;  /* 14px */
  --spike-space-4: 1rem;        /* 16px */
  --spike-space-5: 1.25rem;     /* 20px */
  --spike-space-6: 1.5rem;      /* 24px */
  --spike-space-7: 1.75rem;     /* 28px */
  --spike-space-8: 2rem;        /* 32px */
  --spike-space-9: 2.25rem;     /* 36px */
  --spike-space-10: 2.5rem;     /* 40px */
  --spike-space-12: 3rem;       /* 48px */
  --spike-space-14: 3.5rem;     /* 56px */
  --spike-space-16: 4rem;       /* 64px */
  --spike-space-20: 5rem;       /* 80px */
  --spike-space-24: 6rem;       /* 96px */
  --spike-space-28: 7rem;       /* 112px */
  --spike-space-32: 8rem;       /* 128px */
  
  /* Component-specific spacing */
  --spike-container-padding: var(--spike-space-4);
  --spike-section-gap: var(--spike-space-12);
  --spike-card-padding: var(--spike-space-6);
  --spike-button-padding-x: var(--spike-space-6);
  --spike-button-padding-y: var(--spike-space-3);
  --spike-input-padding-x: var(--spike-space-4);
  --spike-input-padding-y: var(--spike-space-3);
}
```

#### 1.4 Effects Tokens
```css
/* assets/css/spike-theme/tokens/_effects.css */
:root {
  /* Border Radius */
  --spike-radius-none: 0;
  --spike-radius-sm: 0.125rem;   /* 2px */
  --spike-radius-base: 0.25rem;  /* 4px */
  --spike-radius-md: 0.375rem;   /* 6px */
  --spike-radius-lg: 0.5rem;     /* 8px */
  --spike-radius-xl: 0.75rem;    /* 12px */
  --spike-radius-2xl: 1rem;      /* 16px */
  --spike-radius-3xl: 1.5rem;    /* 24px */
  --spike-radius-full: 9999px;
  
  /* Shadows */
  --spike-shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --spike-shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --spike-shadow-base: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --spike-shadow-md: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --spike-shadow-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  --spike-shadow-xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  --spike-shadow-2xl: 0 35px 60px -15px rgba(0, 0, 0, 0.3);
  --spike-shadow-inner: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
  --spike-shadow-none: none;
  
  /* Transitions */
  --spike-transition-fast: 150ms;
  --spike-transition-base: 200ms;
  --spike-transition-slow: 300ms;
  --spike-transition-slower: 500ms;
  
  /* Easing Functions */
  --spike-ease-linear: linear;
  --spike-ease-in: cubic-bezier(0.4, 0, 1, 1);
  --spike-ease-out: cubic-bezier(0, 0, 0.2, 1);
  --spike-ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --spike-ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
  
  /* Z-index Scale */
  --spike-z-0: 0;
  --spike-z-10: 10;
  --spike-z-20: 20;
  --spike-z-30: 30;
  --spike-z-40: 40;
  --spike-z-50: 50;
  --spike-z-dropdown: 1000;
  --spike-z-sticky: 1020;
  --spike-z-fixed: 1030;
  --spike-z-modal-backdrop: 1040;
  --spike-z-modal: 1050;
  --spike-z-popover: 1060;
  --spike-z-tooltip: 1070;
  --spike-z-notification: 1080;
}
```

### Step 2: Base Styles Implementation

#### 2.1 CSS Reset
```css
/* assets/css/spike-theme/base/_reset.css */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  -webkit-text-size-adjust: 100%;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  font-size: 16px;
  line-height: 1.5;
}

body {
  font-family: var(--spike-font-sans);
  font-size: var(--spike-text-base);
  line-height: var(--spike-leading-normal);
  color: var(--spike-text);
  background-color: var(--spike-background);
  min-height: 100vh;
}

h1, h2, h3, h4, h5, h6 {
  font-weight: var(--spike-font-bold);
  line-height: var(--spike-leading-tight);
  color: var(--spike-text);
}

a {
  color: var(--spike-primary);
  text-decoration: none;
  transition: color var(--spike-transition-base) var(--spike-ease-in-out);
}

a:hover {
  color: var(--spike-primary-hover);
}

img, video {
  max-width: 100%;
  height: auto;
  display: block;
}

button, input, select, textarea {
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}

button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible,
a:focus-visible {
  outline: 2px solid var(--spike-primary);
  outline-offset: 2px;
}
```

#### 2.2 Global Utilities
```css
/* assets/css/spike-theme/base/_utilities.css */

/* Layout Utilities */
.spike-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spike-container-padding);
}

.spike-flex {
  display: flex;
}

.spike-grid {
  display: grid;
}

.spike-hidden {
  display: none !important;
}

/* Spacing Utilities */
.spike-m-auto { margin: auto; }
.spike-mx-auto { margin-left: auto; margin-right: auto; }
.spike-my-auto { margin-top: auto; margin-bottom: auto; }

/* Text Utilities */
.spike-text-center { text-align: center; }
.spike-text-left { text-align: left; }
.spike-text-right { text-align: right; }

.spike-font-normal { font-weight: var(--spike-font-normal); }
.spike-font-medium { font-weight: var(--spike-font-medium); }
.spike-font-semibold { font-weight: var(--spike-font-semibold); }
.spike-font-bold { font-weight: var(--spike-font-bold); }

.spike-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Visual Utilities */
.spike-shadow-sm { box-shadow: var(--spike-shadow-sm); }
.spike-shadow { box-shadow: var(--spike-shadow-base); }
.spike-shadow-md { box-shadow: var(--spike-shadow-md); }
.spike-shadow-lg { box-shadow: var(--spike-shadow-lg); }

.spike-rounded-sm { border-radius: var(--spike-radius-sm); }
.spike-rounded { border-radius: var(--spike-radius-md); }
.spike-rounded-lg { border-radius: var(--spike-radius-lg); }
.spike-rounded-full { border-radius: var(--spike-radius-full); }

/* State Utilities */
.spike-disabled {
  opacity: var(--spike-disabled-opacity);
  cursor: not-allowed !important;
  pointer-events: none;
}

.spike-loading {
  position: relative;
  color: transparent !important;
  pointer-events: none;
}

.spike-loading::after {
  content: '';
  position: absolute;
  width: 1em;
  height: 1em;
  top: 50%;
  left: 50%;
  margin-left: -0.5em;
  margin-top: -0.5em;
  border: 2px solid var(--spike-primary);
  border-radius: 50%;
  border-top-color: transparent;
  animation: spike-spin 0.6s linear infinite;
}

@keyframes spike-spin {
  to { transform: rotate(360deg); }
}

/* Accessibility */
.spike-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.spike-focus-visible:focus {
  outline: 2px solid var(--spike-primary);
  outline-offset: 2px;
}
```

### Step 3: Component Styles

#### 3.1 Button Component Styles
```css
/* assets/css/spike-theme/components/_buttons.css */

.spike-btn {
  /* Base styles */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spike-space-2);
  padding: var(--spike-button-padding-y) var(--spike-button-padding-x);
  font-family: var(--spike-font-sans);
  font-size: var(--spike-text-base);
  font-weight: var(--spike-font-semibold);
  line-height: var(--spike-leading-none);
  text-align: center;
  text-decoration: none;
  vertical-align: middle;
  cursor: pointer;
  user-select: none;
  border: 2px solid transparent;
  border-radius: var(--spike-radius-lg);
  transition: all var(--spike-transition-base) var(--spike-ease-out);
  position: relative;
  overflow: hidden;
}

/* Sizes */
.spike-btn--xs {
  padding: var(--spike-space-1) var(--spike-space-3);
  font-size: var(--spike-text-xs);
}

.spike-btn--sm {
  padding: var(--spike-space-2) var(--spike-space-4);
  font-size: var(--spike-text-sm);
}

.spike-btn--lg {
  padding: var(--spike-space-4) var(--spike-space-8);
  font-size: var(--spike-text-lg);
}

.spike-btn--xl {
  padding: var(--spike-space-5) var(--spike-space-10);
  font-size: var(--spike-text-xl);
}

/* Variants */
.spike-btn--primary {
  background: linear-gradient(135deg, var(--spike-primary) 0%, var(--spike-primary-hover) 100%);
  color: var(--spike-text-inverse);
  border-color: transparent;
}

.spike-btn--primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--spike-shadow-lg);
}

.spike-btn--primary:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: var(--spike-shadow-sm);
}

.spike-btn--secondary {
  background: transparent;
  color: var(--spike-primary);
  border-color: var(--spike-primary);
}

.spike-btn--secondary:hover:not(:disabled) {
  background: var(--spike-primary-light);
  border-color: var(--spike-primary-hover);
}

.spike-btn--success {
  background: var(--spike-success);
  color: var(--spike-text-inverse);
  border-color: transparent;
}

.spike-btn--success:hover:not(:disabled) {
  background: var(--spike-success-dark);
  transform: translateY(-2px);
  box-shadow: var(--spike-shadow-md);
}

.spike-btn--warning {
  background: var(--spike-warning);
  color: var(--spike-gray-900);
  border-color: transparent;
}

.spike-btn--danger {
  background: var(--spike-error);
  color: var(--spike-text-inverse);
  border-color: transparent;
}

.spike-btn--ghost {
  background: transparent;
  color: var(--spike-text);
  border-color: transparent;
}

.spike-btn--ghost:hover:not(:disabled) {
  background: var(--spike-hover-overlay);
}

/* States */
.spike-btn:disabled,
.spike-btn--disabled {
  opacity: var(--spike-disabled-opacity);
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.spike-btn--loading {
  color: transparent;
  pointer-events: none;
}

.spike-btn--loading::after {
  content: '';
  position: absolute;
  width: 1.2em;
  height: 1.2em;
  top: 50%;
  left: 50%;
  margin-left: -0.6em;
  margin-top: -0.6em;
  border: 2px solid currentColor;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spike-spin 0.6s linear infinite;
  color: var(--spike-text-inverse);
}

.spike-btn--block {
  display: flex;
  width: 100%;
}

/* Icon Support */
.spike-btn__icon {
  display: inline-flex;
  width: 1.2em;
  height: 1.2em;
  flex-shrink: 0;
}

.spike-btn__icon--left {
  margin-right: var(--spike-space-2);
}

.spike-btn__icon--right {
  margin-left: var(--spike-space-2);
}
```

#### 3.2 Card Component Styles
```css
/* assets/css/spike-theme/components/_cards.css */

.spike-card {
  background: var(--spike-surface);
  border: 1px solid var(--spike-border);
  border-radius: var(--spike-radius-lg);
  overflow: hidden;
  transition: all var(--spike-transition-base) var(--spike-ease-out);
}

/* Variants */
.spike-card--flat {
  box-shadow: none;
}

.spike-card--outlined {
  box-shadow: none;
  border: 2px solid var(--spike-border);
}

.spike-card--elevated {
  box-shadow: var(--spike-shadow-base);
  border: none;
}

.spike-card--hoverable:hover {
  transform: translateY(-4px);
  box-shadow: var(--spike-shadow-lg);
}

.spike-card--clickable {
  cursor: pointer;
}

.spike-card--selected {
  border-color: var(--spike-primary);
  box-shadow: 0 0 0 3px var(--spike-focus-ring);
}

/* Card Sections */
.spike-card__header {
  padding: var(--spike-space-6);
  border-bottom: 1px solid var(--spike-border-light);
}

.spike-card__body {
  padding: var(--spike-space-6);
}

.spike-card__footer {
  padding: var(--spike-space-4) var(--spike-space-6);
  border-top: 1px solid var(--spike-border-light);
  background: var(--spike-surface-variant);
}

/* Card Sizes */
.spike-card--sm .spike-card__header,
.spike-card--sm .spike-card__body {
  padding: var(--spike-space-4);
}

.spike-card--lg .spike-card__header,
.spike-card--lg .spike-card__body {
  padding: var(--spike-space-8);
}

/* Card Image */
.spike-card__image {
  width: 100%;
  height: auto;
  object-fit: cover;
}

.spike-card__image--top {
  border-radius: var(--spike-radius-lg) var(--spike-radius-lg) 0 0;
}
```

#### 3.3 Form Component Styles
```css
/* assets/css/spike-theme/components/_forms.css */

/* Input Base */
.spike-input {
  display: block;
  width: 100%;
  padding: var(--spike-input-padding-y) var(--spike-input-padding-x);
  font-family: var(--spike-font-sans);
  font-size: var(--spike-text-base);
  line-height: var(--spike-leading-normal);
  color: var(--spike-text);
  background: var(--spike-surface);
  border: 2px solid var(--spike-border);
  border-radius: var(--spike-radius-md);
  transition: all var(--spike-transition-fast) var(--spike-ease-out);
  appearance: none;
}

.spike-input:focus {
  outline: none;
  border-color: var(--spike-primary);
  box-shadow: 0 0 0 3px var(--spike-focus-ring);
}

.spike-input::placeholder {
  color: var(--spike-text-muted);
}

.spike-input:disabled {
  background: var(--spike-surface-variant);
  color: var(--spike-text-disabled);
  cursor: not-allowed;
}

/* Input Sizes */
.spike-input--sm {
  padding: var(--spike-space-2) var(--spike-space-3);
  font-size: var(--spike-text-sm);
}

.spike-input--lg {
  padding: var(--spike-space-4) var(--spike-space-5);
  font-size: var(--spike-text-lg);
}

/* Input States */
.spike-input--error {
  border-color: var(--spike-error);
}

.spike-input--error:focus {
  box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.25);
}

.spike-input--success {
  border-color: var(--spike-success);
}

/* Form Group */
.spike-form-group {
  margin-bottom: var(--spike-space-6);
}

.spike-form-label {
  display: block;
  margin-bottom: var(--spike-space-2);
  font-size: var(--spike-text-sm);
  font-weight: var(--spike-font-medium);
  color: var(--spike-text);
}

.spike-form-label--required::after {
  content: ' *';
  color: var(--spike-error);
}

.spike-form-help {
  display: block;
  margin-top: var(--spike-space-2);
  font-size: var(--spike-text-sm);
  color: var(--spike-text-secondary);
}

.spike-form-error {
  display: block;
  margin-top: var(--spike-space-2);
  font-size: var(--spike-text-sm);
  color: var(--spike-error);
}

/* Checkbox & Radio */
.spike-checkbox,
.spike-radio {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.spike-checkbox__input,
.spike-radio__input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.spike-checkbox__box,
.spike-radio__box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  margin-right: var(--spike-space-2);
  background: var(--spike-surface);
  border: 2px solid var(--spike-border);
  transition: all var(--spike-transition-fast) var(--spike-ease-out);
}

.spike-checkbox__box {
  border-radius: var(--spike-radius-base);
}

.spike-radio__box {
  border-radius: var(--spike-radius-full);
}

.spike-checkbox__input:checked + .spike-checkbox__box,
.spike-radio__input:checked + .spike-radio__box {
  background: var(--spike-primary);
  border-color: var(--spike-primary);
}

.spike-checkbox__input:focus-visible + .spike-checkbox__box,
.spike-radio__input:focus-visible + .spike-radio__box {
  box-shadow: 0 0 0 3px var(--spike-focus-ring);
}

.spike-checkbox__checkmark {
  display: none;
  width: 0.75rem;
  height: 0.75rem;
  color: var(--spike-text-inverse);
}

.spike-checkbox__input:checked + .spike-checkbox__box .spike-checkbox__checkmark {
  display: block;
}

.spike-radio__dot {
  display: none;
  width: 0.5rem;
  height: 0.5rem;
  background: var(--spike-text-inverse);
  border-radius: var(--spike-radius-full);
}

.spike-radio__input:checked + .spike-radio__box .spike-radio__dot {
  display: block;
}

/* Select */
.spike-select {
  display: block;
  width: 100%;
  padding: var(--spike-input-padding-y) var(--spike-input-padding-x);
  padding-right: var(--spike-space-10);
  font-family: var(--spike-font-sans);
  font-size: var(--spike-text-base);
  line-height: var(--spike-leading-normal);
  color: var(--spike-text);
  background: var(--spike-surface);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M6 9L2 5h8z' fill='%236c757d'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--spike-space-3) center;
  background-size: 12px;
  border: 2px solid var(--spike-border);
  border-radius: var(--spike-radius-md);
  appearance: none;
  cursor: pointer;
  transition: all var(--spike-transition-fast) var(--spike-ease-out);
}

.spike-select:focus {
  outline: none;
  border-color: var(--spike-primary);
  box-shadow: 0 0 0 3px var(--spike-focus-ring);
}
```

### Step 4: Main Entry File
```css
/* assets/css/spike-theme/index.css */

/* Import Design Tokens */
@import './tokens/_colors.css';
@import './tokens/_typography.css';
@import './tokens/_spacing.css';
@import './tokens/_effects.css';

/* Import Base Styles */
@import './base/_reset.css';
@import './base/_utilities.css';

/* Import Component Styles */
@import './components/_buttons.css';
@import './components/_cards.css';
@import './components/_forms.css';

/* Custom Properties for Component Defaults */
:root {
  /* Control Heights */
  --spike-control-height-sm: 32px;
  --spike-control-height-md: 40px;
  --spike-control-height-lg: 48px;
  --spike-control-height-xl: 56px;
  
  /* Default Transitions */
  --spike-transition-default: var(--spike-transition-base) var(--spike-ease-out);
  
  /* Focus States */
  --spike-focus-ring-width: 3px;
  --spike-focus-ring-color: var(--spike-focus-ring);
}

/* Print Styles */
@media print {
  body {
    background: white;
    color: black;
  }
  
  .spike-no-print {
    display: none !important;
  }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
  :root {
    --spike-border: var(--spike-gray-900);
    --spike-focus-ring: rgba(0, 0, 0, 0.5);
  }
}

/* Dark Mode Preparation */
@media (prefers-color-scheme: dark) {
  :root[data-theme="auto"] {
    --spike-background: var(--spike-gray-900);
    --spike-surface: var(--spike-gray-800);
    --spike-surface-variant: var(--spike-gray-700);
    --spike-border: var(--spike-gray-600);
    --spike-text: var(--spike-gray-50);
    --spike-text-secondary: var(--spike-gray-300);
    --spike-text-muted: var(--spike-gray-500);
  }
}
```

---

This implementation provides a complete, production-ready CSS architecture for the Spike theme with:

1. **Comprehensive design tokens** for colors, typography, spacing, and effects
2. **Modular organization** with clear separation of concerns
3. **Component-specific styles** that follow BEM-like naming conventions
4. **Accessibility features** including focus states and reduced motion
5. **Performance optimizations** through CSS custom properties
6. **Future-proofing** with dark mode and high contrast preparations

The architecture is designed to be immediately implementable and follows best practices for maintainability and scalability.