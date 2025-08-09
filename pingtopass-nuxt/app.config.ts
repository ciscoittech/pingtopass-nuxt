/**
 * Nuxt App Configuration
 * 
 * Configures @nuxt/ui with Spike theme colors and design tokens.
 * This bridges the Spike design system with @nuxt/ui components.
 */

import { generateAppConfigColors } from '~/utils/theme/color-generator'

export default defineAppConfig({
  ui: {
    // Set Spike as the primary color for @nuxt/ui
    primary: 'spike',
    
    // Generate complete color scales for @nuxt/ui
    colors: generateAppConfigColors(),
    
    // Override default component configurations to match Spike theme
    strategy: 'override',
    
    // Button component customization
    button: {
      default: {
        color: 'spike',
        variant: 'solid',
        size: 'md',
        loadingIcon: 'i-heroicons-arrow-path-20-solid',
        
        // Custom styling to match Spike theme
        base: [
          'focus:outline-none',
          'focus-visible:outline',
          'focus-visible:outline-2',
          'focus-visible:outline-offset-2',
          'focus-visible:outline-{color}-500',
          'disabled:cursor-not-allowed',
          'disabled:opacity-75',
          'flex-shrink-0',
          'font-medium',
          'rounded-md',
          'text-sm',
          'gap-x-2',
          'px-3',
          'py-2',
          'shadow-sm',
          'text-white',
          'dark:text-white',
          'inline-flex',
          'items-center',
          'transition-all',
          'duration-200',
          'ease-out'
        ].join(' ')
      }
    },
    
    // Input component customization
    input: {
      default: {
        color: 'spike',
        variant: 'outline',
        size: 'md',
        
        base: [
          'relative',
          'block',
          'w-full',
          'disabled:cursor-not-allowed',
          'disabled:opacity-75',
          'focus:outline-none',
          'border-0',
          'placeholder-gray-400',
          'dark:placeholder-gray-500',
          'transition-all',
          'duration-200',
          'ease-out'
        ].join(' ')
      }
    },
    
    // Card component customization
    card: {
      base: [
        'overflow-hidden',
        'transition-all',
        'duration-200',
        'ease-out'
      ].join(' '),
      
      background: 'bg-white dark:bg-neutral-900',
      divide: 'divide-y divide-neutral-200 dark:divide-neutral-800',
      ring: 'ring-1 ring-neutral-200 dark:ring-neutral-800',
      rounded: 'rounded-lg',
      shadow: 'shadow-sm hover:shadow-md'
    },
    
    // Modal component customization
    modal: {
      overlay: {
        base: [
          'fixed',
          'inset-0',
          'transition-opacity',
          'backdrop-blur-sm',
          'bg-neutral-200/75',
          'dark:bg-neutral-800/75'
        ].join(' ')
      },
      
      base: [
        'relative',
        'text-left',
        'rtl:text-right',
        'flex',
        'flex-col',
        'transition-all',
        'duration-200',
        'ease-out'
      ].join(' ')
    },
    
    // Notification component customization
    notification: {
      default: {
        color: 'spike',
        icon: null,
        closeButton: null,
        actionButton: {
          size: 'xs',
          color: 'primary'
        }
      }
    },
    
    // Badge component customization
    badge: {
      default: {
        color: 'spike',
        variant: 'solid',
        size: 'md'
      }
    },
    
    // Dropdown component customization  
    dropdown: {
      wrapper: 'relative inline-flex text-left rtl:text-right',
      container: 'z-20 group',
      width: 'w-48',
      height: '',
      
      base: [
        'relative',
        'focus:outline-none',
        'overflow-y-auto',
        'scroll-py-1',
        'transition-all',
        'duration-200',
        'ease-out'
      ].join(' '),
      
      background: 'bg-white dark:bg-neutral-900',
      shadow: 'shadow-lg',
      rounded: 'rounded-md',
      ring: 'ring-1 ring-neutral-200 dark:ring-neutral-800',
      divide: 'divide-y divide-neutral-200 dark:divide-neutral-700'
    }
  },
  
  // Custom Spike theme configuration
  spike: {
    // Brand colors
    brand: {
      primary: '#0085db',
      primaryDark: '#006bb8',
      primaryLight: '#339ddf'
    },
    
    // Semantic colors
    semantic: {
      info: '#46caeb',
      success: '#28a745',
      warning: '#ffc107',
      error: '#dc3545',
      danger: '#dc3545'
    },
    
    // Typography
    typography: {
      fontFamily: {
        base: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        mono: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
      },
      
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem', 
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem'
      },
      
      lineHeight: {
        base: 1.6,
        tight: 1.25,
        loose: 1.75
      }
    },
    
    // Spacing
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '0.75rem',
      lg: '1rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '2rem',
      '4xl': '2.5rem'
    },
    
    // Border radius
    borderRadius: {
      sm: '0.125rem',
      base: '0.25rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem',
      '2xl': '1rem',
      full: '9999px'
    },
    
    // Shadows
    shadows: {
      sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
    },
    
    // Animation and transitions
    animation: {
      duration: {
        fast: '150ms',
        base: '200ms', 
        slow: '300ms'
      },
      
      easing: {
        base: 'ease-out',
        in: 'ease-in',
        out: 'ease-out',
        inOut: 'ease-in-out'
      }
    },
    
    // Responsive breakpoints (matching CSS)
    breakpoints: {
      xs: '480px',
      sm: '640px', 
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px'
    }
  }
})