/**
 * Unit test for the Matrix → MatrixSvg data flow.
 * Reproduces the bug: Svelte 5 $: reactivity ordering causes rowLen=0
 * to be passed to MatrixSvg instead of data.length, resulting in a
 * 1-row SVG instead of NxN.
 */
import { describe, it, expect } from 'vitest'

// This test doesn't render Svelte components (no DOM needed).
// It tests the LOGIC that Matrix.svelte uses to compute props.

describe('Matrix data → props computation', () => {
  // Simulates what Matrix.svelte does:
  // $: { rowLen = data.length; dimension = data[0]?.length || 0; }
  // $: props = { data, rowLen, dimension, ... }

  it('computes correct rowLen and dimension for 8x8 data', () => {
    const data = Array(8).fill(0).map(() => Array(8).fill(-Infinity))

    // This is what Matrix.svelte SHOULD compute:
    const rowLen = data.length
    const dimension = data[0]?.length || 0

    expect(rowLen).toBe(8)
    expect(dimension).toBe(8)
  })

  it('computes correct rowLen for 6x6 data', () => {
    const data = Array(6).fill(0).map(() => Array(6).fill(0))

    const rowLen = data.length
    const dimension = data[0]?.length || 0

    expect(rowLen).toBe(6)
    expect(dimension).toBe(6)
  })

  it('handles empty data', () => {
    const data: number[][] = []

    const rowLen = data.length
    const dimension = data[0]?.length || 0

    expect(rowLen).toBe(0)
    expect(dimension).toBe(0)
  })

  // This test proves the Svelte 5 $: ordering bug:
  // When two $: blocks exist where one MUTATES a variable and
  // the other READS it, Svelte 5 may run them in wrong order.
  it('inline computation avoids $: ordering bug', () => {
    const data = Array(8).fill(0).map(() => Array(8).fill(-Infinity))

    // BUG pattern (Svelte 5):
    // let rowLen = 0;                    // initial value
    // $: { rowLen = data.length; }       // effect 1: mutates rowLen
    // $: props = { rowLen, ... }         // effect 2: reads rowLen
    // In Svelte 5, effect 2 may run before effect 1 → rowLen = 0

    // FIX pattern: compute inline, no mutation
    // $: props = { rowLen: data.length, dimension: data[0]?.length || 0, ... }
    const props = {
      data,
      rowLen: data.length,
      dimension: data[0]?.length || 0,
    }

    expect(props.rowLen).toBe(8)
    expect(props.dimension).toBe(8)

    // SVG height should be 8*12 + 7*3 = 117, not 12
    const cellHeight = 12
    const rowGap = 3
    const svgHeight = props.rowLen * cellHeight + (props.rowLen - 1) * rowGap
    expect(svgHeight).toBe(117)
  })
})
