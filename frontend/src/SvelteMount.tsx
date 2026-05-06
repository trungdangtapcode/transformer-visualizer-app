import { useRef, useEffect } from 'react'
import { mount, unmount } from 'svelte'
import TransformerApp from './svelte/TransformerApp.svelte'

/**
 * React wrapper that mounts the Svelte TransformerApp directly into the DOM.
 * No iframe — Svelte and React share the same document.
 */
export default function SvelteMount() {
  const containerRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<ReturnType<typeof mount> | null>(null)

  useEffect(() => {
    if (containerRef.current && !instanceRef.current) {
      instanceRef.current = mount(TransformerApp, {
        target: containerRef.current,
      })
    }
    return () => {
      if (instanceRef.current) {
        unmount(instanceRef.current)
        instanceRef.current = null
      }
    }
  }, [])

  return <div ref={containerRef} className="w-full h-full" />
}
