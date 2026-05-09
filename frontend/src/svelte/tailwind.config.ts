/**
 * Minimal Tailwind config shim for runtime theme color access.
 * The Svelte components import `tailwind.config` and pass it to
 * `resolveConfig()` to get theme colors at runtime (for D3, canvas, etc.).
 * Since we use Tailwind CSS 4 via @tailwindcss/vite, the real config is
 * handled by the plugin. This file only provides the extend block.
 */
export default {
  content: [],
  theme: {
    extend: {
      colors: {
        cyan: {
          50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9',
          400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490',
          800: '#155e75', 900: '#164e63', 950: '#083344',
        },
      },
    },
  },
}
