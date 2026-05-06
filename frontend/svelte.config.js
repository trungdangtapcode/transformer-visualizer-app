import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

export default {
  preprocess: vitePreprocess(),
  // Svelte 5 handles Svelte 4 syntax automatically (legacy mode)
  compilerOptions: {
    // Allow Svelte 4 patterns ($:, export let, on:event, <slot/>, etc.)
    // Suppress non-critical warnings from ported components
    warningFilter: (warning) => {
      // Suppress a11y warnings from upstream transformer-explainer code
      if (warning.code?.startsWith('a11y')) return false
      // Suppress legacy API warnings (export let, $:, on:, slot, etc.)
      if (warning.code?.startsWith('legacy')) return false
      return true
    },
  },
}
