import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock SvelteMount — the Svelte app depends on ONNX/WASM which doesn't work in jsdom
vi.mock('../SvelteMount', () => ({
  default: () => <div data-testid="svelte-mount">Transformer Explorer (Svelte)</div>,
}))

import App from '../App'

// Mock fetch globally
const mockFetch = vi.fn()
globalThis.fetch = mockFetch as typeof fetch

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ──────────────────────────────────────────────
  // Rendering & Layout Tests
  // ──────────────────────────────────────────────

  it('renders the app logo', () => {
    render(<App />)
    const logo = screen.getByRole('heading', { level: 1 })
    expect(logo).toBeInTheDocument()
    expect(logo.textContent).toContain('IETNAMESE')
    expect(logo.textContent).toContain('ISUALIZER')
  })

  it('renders the logo with Jersey 10 font', () => {
    render(<App />)
    const logo = screen.getByRole('heading', { level: 1 })
    expect(logo.style.fontFamily).toContain('Jersey 10')
  })

  it('renders both tab buttons', () => {
    render(<App />)
    expect(screen.getByText('Transformer Explorer')).toBeInTheDocument()
    expect(screen.getByText('Attention Analyzer')).toBeInTheDocument()
  })

  it('renders tab sublabels', () => {
    render(<App />)
    expect(screen.getByText('GPT-2 Vietnamese')).toBeInTheDocument()
    // "PhoBERT" appears in both the tab sublabel and the status badge
    expect(screen.getAllByText('PhoBERT').length).toBeGreaterThanOrEqual(1)
  })

  it('renders the Svelte mount in transformer tab by default', () => {
    render(<App />)
    expect(screen.getByTestId('svelte-mount')).toBeInTheDocument()
  })

  it('renders GitHub and Paper links', () => {
    render(<App />)
    const githubLink = screen.getByLabelText('GitHub')
    const paperLink = screen.getByLabelText('Paper PDF')
    expect(githubLink).toHaveAttribute('href', 'https://github.com/poloclub/transformer-explainer')
    expect(paperLink).toHaveAttribute('href', 'https://arxiv.org/abs/2408.04619')
  })

  it('links open in new tab', () => {
    render(<App />)
    const githubLink = screen.getByLabelText('GitHub')
    expect(githubLink).toHaveAttribute('target', '_blank')
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  // ──────────────────────────────────────────────
  // Theme / Design Tests
  // ──────────────────────────────────────────────

  it('uses white background (light theme)', () => {
    render(<App />)
    const root = document.querySelector('.min-h-screen')
    expect(root).toHaveClass('bg-white')
  })

  it('uses gray text color (light theme)', () => {
    render(<App />)
    const root = document.querySelector('.min-h-screen')
    expect(root).toHaveClass('text-gray-900')
  })

  // ──────────────────────────────────────────────
  // Tab Switching Tests
  // ──────────────────────────────────────────────

  it('shows transformer tab content by default', () => {
    render(<App />)
    const transformerTab = screen.getByText('Transformer Explorer').closest('button')
    expect(transformerTab).toHaveAttribute('aria-selected', 'true')
  })

  it('switches to attention tab on click', async () => {
    const user = userEvent.setup()
    render(<App />)

    const attentionTab = screen.getByText('Attention Analyzer').closest('button')!
    await user.click(attentionTab)

    expect(attentionTab).toHaveAttribute('aria-selected', 'true')
    // Attention tab should show empty state
    expect(screen.getByText('Trực quan hóa Attention')).toBeInTheDocument()
  })

  it('both tabs remain mounted (hidden via CSS)', () => {
    render(<App />)
    // Svelte mount is always in the DOM
    expect(screen.getByTestId('svelte-mount')).toBeInTheDocument()
    // BertViz iframe is always in the DOM
    expect(screen.getByTitle('BertViz Output')).toBeInTheDocument()
  })

  // ──────────────────────────────────────────────
  // Attention Analyzer Tab Tests
  // ──────────────────────────────────────────────

  it('renders attention tab input fields when active', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Switch to attention tab
    await user.click(screen.getByText('Attention Analyzer'))

    const inputA = screen.getByPlaceholderText(/Nhập câu để phân tích/i)
    expect(inputA).toBeInTheDocument()
    expect(inputA).toHaveValue('Con thỏ bỗng nhảy vọt lên.')
  })

  it('renders PhoBERT status badge', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByText('Attention Analyzer'))
    // "PhoBERT" appears in both the tab sublabel and the status badge
    const badges = screen.getAllByText('PhoBERT')
    expect(badges.length).toBe(2) // tab sublabel + status badge
  })

  it('renders Generate button', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByText('Attention Analyzer'))
    expect(screen.getByRole('button', { name: /Generate/i })).not.toBeDisabled()
  })

  it('renders empty state placeholder when no result', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByText('Attention Analyzer'))

    expect(screen.getByText('Trực quan hóa Attention')).toBeInTheDocument()
    expect(screen.getByText(/Nhập câu và nhấn/i)).toBeInTheDocument()
  })

  it('renders the BertViz visualization iframe', () => {
    render(<App />)
    const iframe = screen.getByTitle('BertViz Output')
    expect(iframe).toBeInTheDocument()
  })

  // ──────────────────────────────────────────────
  // Interaction Tests
  // ──────────────────────────────────────────────

  it('allows typing in sentence A input', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByText('Attention Analyzer'))

    const input = screen.getByPlaceholderText(/Nhập câu để phân tích/i)
    await user.clear(input)
    await user.type(input, 'Xin chào')
    expect(input).toHaveValue('Xin chào')
  })

  // ──────────────────────────────────────────────
  // Form Submission Tests (Attention Analyzer)
  // ──────────────────────────────────────────────

  it('shows loading state when form is submitted', async () => {
    mockFetch.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByText('Attention Analyzer'))

    const button = screen.getByRole('button', { name: /Generate/i })
    await user.click(button)

    expect(screen.getByText(/Đang xử lý/i)).toBeInTheDocument()
    expect(button).toBeDisabled()
  })

  it('sends correct form data on submit via proxy URL', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<div>test visualization</div>'),
    })

    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByText('Attention Analyzer'))
    await user.click(screen.getByRole('button', { name: /Generate/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/visualize',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    const callArgs = mockFetch.mock.calls[0]
    const formData = callArgs[1].body as FormData
    expect(formData.get('view_type')).toBe('model_view')
    expect(formData.get('sentence_a')).toBe('Con thỏ bỗng nhảy vọt lên.')
    expect(formData.get('sentence_b')).toBe('')
  })

  it('renders visualization result in iframe after successful submit', async () => {
    const mockHtml = '<div id="bertviz-test">Mock Visualization</div>'
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockHtml),
    })

    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByText('Attention Analyzer'))
    await user.click(screen.getByRole('button', { name: /Generate/i }))

    await waitFor(() => {
      const iframe = screen.getByTitle('BertViz Output') as HTMLIFrameElement
      expect(iframe.srcdoc).toContain(mockHtml)
    })
  })

  it('injects light theme styles into iframe', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<div>viz</div>'),
    })

    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByText('Attention Analyzer'))
    await user.click(screen.getByRole('button', { name: /Generate/i }))

    await waitFor(() => {
      const iframe = screen.getByTitle('BertViz Output') as HTMLIFrameElement
      expect(iframe.srcdoc).toContain('background: #ffffff')
      expect(iframe.srcdoc).toContain('color: #111827')
      expect(iframe.srcdoc).toContain("font-family: 'Inter'")
    })
  })

  it('shows error message on fetch failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByText('Attention Analyzer'))
    await user.click(screen.getByRole('button', { name: /Generate/i }))

    await waitFor(() => {
      const iframe = screen.getByTitle('BertViz Output') as HTMLIFrameElement
      expect(iframe.srcdoc).toContain('Network error')
    })
  })

  it('shows error on non-ok HTTP response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    })

    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByText('Attention Analyzer'))
    await user.click(screen.getByRole('button', { name: /Generate/i }))

    await waitFor(() => {
      const iframe = screen.getByTitle('BertViz Output') as HTMLIFrameElement
      expect(iframe.srcdoc).toContain('Server returned 500')
    })
  })

  it('re-enables button after submission completes', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<div>result</div>'),
    })

    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByText('Attention Analyzer'))

    const button = screen.getByRole('button', { name: /Generate/i })
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Generate/i })).not.toBeDisabled()
    })
  })

  it('hides empty state after successful submission', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<div>result</div>'),
    })

    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByText('Attention Analyzer'))

    expect(screen.getByText('Trực quan hóa Attention')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Generate/i }))

    await waitFor(() => {
      expect(screen.queryByText('Trực quan hóa Attention')).not.toBeInTheDocument()
    })
  })
})
