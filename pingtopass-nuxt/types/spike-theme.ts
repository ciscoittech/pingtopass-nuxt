/* Spike Theme TypeScript Definitions */

// Button Component Types
export type ButtonVariant = 
  | 'primary'
  | 'secondary' 
  | 'success'
  | 'warning'
  | 'danger'
  | 'ghost'
  | 'outline'

export type ButtonSize = 
  | 'xs' 
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'

export interface ButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  loading?: boolean
  block?: boolean
  icon?: string
  iconPosition?: 'left' | 'right'
  href?: string
  to?: string | object
  type?: 'button' | 'submit' | 'reset'
  ariaLabel?: string
}

// Card Component Types
export type CardVariant = 
  | 'flat'
  | 'outlined'
  | 'elevated'
  | 'filled'

export type CardPadding = 
  | 'none'
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'

export interface CardProps {
  variant?: CardVariant
  padding?: CardPadding
  hoverable?: boolean
  clickable?: boolean
  selected?: boolean
  disabled?: boolean
  loading?: boolean
}

// Input Component Types
export type InputVariant = 
  | 'default'
  | 'filled'
  | 'outlined'

export type InputSize = 
  | 'sm'
  | 'md' 
  | 'lg'

export interface InputProps {
  variant?: InputVariant
  size?: InputSize
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  invalid?: boolean
  placeholder?: string
  helperText?: string
  errorMessage?: string
}

// Badge Component Types
export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'

export type BadgeSize =
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'

export interface BadgeProps {
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
  removable?: boolean
}

// Progress Component Types
export type ProgressVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'

export type ProgressSize =
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'

export interface ProgressProps {
  value?: number
  max?: number
  variant?: ProgressVariant
  size?: ProgressSize
  indeterminate?: boolean
  showValue?: boolean
  label?: string
}

// Modal Component Types
export type ModalSize =
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | 'full'

export interface ModalProps {
  modelValue?: boolean
  size?: ModalSize
  persistent?: boolean
  fullscreen?: boolean
  scrollable?: boolean
  centered?: boolean
  closeOnEscape?: boolean
  closeOnBackdrop?: boolean
  transition?: string
  zIndex?: number
}

// Alert Component Types
export type AlertVariant =
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'

export interface AlertProps {
  variant?: AlertVariant
  title?: string
  dismissible?: boolean
  icon?: boolean
  border?: boolean
}

// Dropdown Component Types
export interface DropdownProps {
  modelValue?: boolean
  placement?: 'top' | 'bottom' | 'left' | 'right'
  offset?: number
  disabled?: boolean
  closeOnClick?: boolean
  closeOnEscape?: boolean
}

// Tooltip Component Types
export type TooltipPlacement = 
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end'
  | 'right'
  | 'right-start'
  | 'right-end'

export interface TooltipProps {
  content: string
  placement?: TooltipPlacement
  disabled?: boolean
  delay?: number
  hideDelay?: number
  arrow?: boolean
  maxWidth?: string
}

// Theme Configuration Types
export interface SpikeThemeConfig {
  colors: {
    primary: string
    secondary: string
    success: string
    warning: string
    danger: string
    info: string
    neutral: Record<string, string>
  }
  typography: {
    fontFamily: {
      sans: string[]
      mono: string[]
    }
    fontSize: Record<string, string>
    fontWeight: Record<string, number>
    lineHeight: Record<string, number>
  }
  spacing: Record<string, string>
  shadows: Record<string, string>
  animations: {
    duration: Record<string, string>
    easing: Record<string, string>
  }
  breakpoints: Record<string, string>
}

// Component Event Types
export interface ButtonEvents {
  click: [event: MouseEvent]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
}

export interface CardEvents {
  click: [event: MouseEvent]
  hover: [event: MouseEvent]
  focus: [event: FocusEvent]
}

export interface InputEvents {
  input: [value: string | number]
  change: [value: string | number]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
  keydown: [event: KeyboardEvent]
  keyup: [event: KeyboardEvent]
}

export interface ModalEvents {
  'update:modelValue': [value: boolean]
  open: []
  close: []
  escape: []
  'backdrop-click': []
}

// Accessibility Types
export interface AriaProps {
  ariaLabel?: string
  ariaLabelledby?: string
  ariaDescribedby?: string
  ariaExpanded?: boolean
  ariaSelected?: boolean
  ariaDisabled?: boolean
  ariaHidden?: boolean
  role?: string
  tabindex?: number
}

// Theme Context Types
export interface ThemeContext {
  theme: 'light' | 'dark' | 'high-contrast'
  setTheme: (theme: 'light' | 'dark' | 'high-contrast') => void
  colors: SpikeThemeConfig['colors']
  breakpoint: {
    current: string
    isXs: boolean
    isSm: boolean
    isMd: boolean
    isLg: boolean
    isXl: boolean
    is2xl: boolean
    isMobile: boolean
    isTablet: boolean
    isDesktop: boolean
  }
}

// Component Ref Types
export interface ButtonRef extends HTMLButtonElement {}
export interface CardRef extends HTMLDivElement {}
export interface InputRef extends HTMLInputElement {}
export interface ModalRef extends HTMLDivElement {}

// Animation Types
export type AnimationPreset = 
  | 'fade-in'
  | 'fade-out'
  | 'slide-in-up'
  | 'slide-in-down'
  | 'slide-in-left'
  | 'slide-in-right'
  | 'scale-in'
  | 'scale-out'
  | 'bounce'
  | 'pulse'
  | 'spin'

// Responsive Types
export type ResponsiveValue<T> = T | {
  xs?: T
  sm?: T
  md?: T
  lg?: T
  xl?: T
  '2xl'?: T
}

// Utility Types
export type ComponentProps<T> = T & AriaProps
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] }
export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>

// Global Type Augmentations
declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $spike: ThemeContext
  }
}

declare module 'nuxt/schema' {
  interface AppConfigInput {
    spike?: Partial<SpikeThemeConfig>
  }
}