/**
 * Color Scale Generator Utility
 * 
 * Generates a complete 50-950 color scale from a base color for @nuxt/ui compatibility.
 * This utility creates the proper color variants needed for the UI system.
 */

/**
 * Color utility functions
 */

/**
 * Convert hex color to HSL
 */
function hexToHsl(hex: string): [number, number, number] {
  // Remove # if present
  hex = hex.replace('#', '')
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16) / 255
  const g = parseInt(hex.substr(2, 2), 16) / 255
  const b = parseInt(hex.substr(4, 2), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

/**
 * Convert HSL to hex
 */
function hslToHex(h: number, s: number, l: number): string {
  h = h / 360
  s = s / 100
  l = l / 100

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
  }

  let r, g, b

  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }

  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Generate a complete color scale from a base color
 * 
 * @param baseColor - The base color in hex format (e.g., "#0085db")
 * @param baseShade - The shade level of the base color (default: 500)
 * @returns Object with color scale from 50 to 950
 */
export function generateColorScale(
  baseColor: string, 
  baseShade: number = 500
): Record<number, string> {
  // Color scale mapping - how much to adjust lightness for each shade
  const lightnessMappings: Record<number, number> = {
    50: 97,   // Very light
    100: 93,  // Light
    200: 86,  // Light
    300: 77,  // Light-medium
    400: 65,  // Medium-light
    500: 50,  // Base (will be adjusted to match input)
    600: 42,  // Medium-dark
    700: 34,  // Dark
    800: 24,  // Darker
    900: 15,  // Very dark
    950: 8    // Darkest
  }
  
  // Get HSL of the base color
  const [hue, saturation, baseLightness] = hexToHsl(baseColor)
  
  // Calculate the actual lightness of the base color
  const targetBaseLightness = lightnessMappings[baseShade]
  const lightnessOffset = baseLightness - targetBaseLightness
  
  // Generate the scale
  const scale: Record<number, string> = {}
  
  Object.entries(lightnessMappings).forEach(([shade, targetLightness]) => {
    const shadeNum = parseInt(shade)
    
    // Adjust lightness while preserving the relationship
    let adjustedLightness = targetLightness + lightnessOffset
    
    // For very light shades, ensure we don't go too dark
    if (shadeNum <= 200) {
      adjustedLightness = Math.max(adjustedLightness, targetLightness * 0.9)
    }
    
    // For very dark shades, ensure we don't go too light
    if (shadeNum >= 800) {
      adjustedLightness = Math.min(adjustedLightness, targetLightness * 1.2)
    }
    
    // Clamp values
    adjustedLightness = Math.max(0, Math.min(100, adjustedLightness))
    
    // Adjust saturation slightly for better color harmony
    let adjustedSaturation = saturation
    if (shadeNum <= 100) {
      adjustedSaturation = Math.max(10, saturation * 0.3) // Reduce saturation for very light shades
    } else if (shadeNum >= 900) {
      adjustedSaturation = Math.max(20, saturation * 0.8) // Reduce saturation for very dark shades
    }
    
    scale[shadeNum] = hslToHex(hue, adjustedSaturation, adjustedLightness)
  })
  
  return scale
}

/**
 * Generate color scale specifically for @nuxt/ui (RGB format)
 * 
 * @param baseColor - The base color in hex format
 * @param name - The color name (e.g., "spike")
 * @param baseShade - The shade level of the base color
 * @returns Object with RGB color values for CSS custom properties
 */
export function generateUIColorScale(
  baseColor: string,
  name: string,
  baseShade: number = 500
): Record<string, string> {
  const hexScale = generateColorScale(baseColor, baseShade)
  const rgbScale: Record<string, string> = {}
  
  Object.entries(hexScale).forEach(([shade, hex]) => {
    // Convert hex to RGB values (comma-separated for CSS custom properties)
    const r = parseInt(hex.substr(1, 2), 16)
    const g = parseInt(hex.substr(3, 2), 16)
    const b = parseInt(hex.substr(5, 2), 16)
    
    rgbScale[`--${name}-${shade}`] = `${r}, ${g}, ${b}`
  })
  
  return rgbScale
}

/**
 * Pre-generated color scales for common Spike theme colors
 */
export const spikeColorScales = {
  // Primary brand color: #0085db
  spike: generateColorScale('#0085db', 500),
  
  // Semantic colors
  success: generateColorScale('#28a745', 500),
  warning: generateColorScale('#ffc107', 500),
  error: generateColorScale('#dc3545', 500),
  info: generateColorScale('#46caeb', 500),
}

/**
 * Generate complete app config colors object
 */
export function generateAppConfigColors() {
  return {
    spike: spikeColorScales.spike,
    success: spikeColorScales.success,
    warning: spikeColorScales.warning,
    error: spikeColorScales.error,
    info: spikeColorScales.info,
    
    // Neutral/gray scale (from existing Spike tokens)
    neutral: {
      50: '#f8f9fa',
      100: '#e9ecef', 
      200: '#dee2e6',
      300: '#ced4da',
      400: '#adb5bd',
      500: '#6c757d',
      600: '#495057',
      700: '#343a40',
      800: '#212529',
      900: '#000000',
      950: '#000000'
    }
  }
}