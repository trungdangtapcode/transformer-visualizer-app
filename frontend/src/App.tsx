import { useState, useRef, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Loader2, Sparkles } from "lucide-react"
import "./App.css"

// ─── Inline SVG icons ──────────────────────────────────────────────────
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" d="M12.006 2a9.847 9.847 0 0 0-6.484 2.44 10.32 10.32 0 0 0-3.393 6.17 10.48 10.48 0 0 0 1.317 6.955 10.045 10.045 0 0 0 5.4 4.418c.504.095.683-.223.683-.494 0-.245-.01-1.052-.014-1.908-2.78.62-3.366-1.21-3.366-1.21a2.711 2.711 0 0 0-1.11-1.5c-.907-.637.07-.621.07-.621.317.044.62.163.885.346.266.183.487.426.647.71.135.253.318.476.538.655a2.079 2.079 0 0 0 2.37.196c.045-.52.27-1.006.635-1.37-2.219-.259-4.554-1.138-4.554-5.07a4.022 4.022 0 0 1 1.031-2.75 3.77 3.77 0 0 1 .096-2.713s.839-.275 2.749 1.05a9.26 9.26 0 0 1 5.004 0c1.906-1.325 2.74-1.05 2.74-1.05.37.858.406 1.828.101 2.713a4.017 4.017 0 0 1 1.029 2.75c0 3.939-2.339 4.805-4.564 5.058a2.471 2.471 0 0 1 .679 1.897c0 1.372-.012 2.477-.012 2.814 0 .272.18.592.687.492a10.05 10.05 0 0 0 5.388-4.421 10.473 10.473 0 0 0 1.313-6.948 10.32 10.32 0 0 0-3.39-6.165A9.847 9.847 0 0 0 12.007 2Z" clipRule="evenodd" />
    </svg>
  )
}

function PdfIcon({ className }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" d="M9 2.221V7H4.221a2 2 0 0 1 .365-.5L8.5 2.586A2 2 0 0 1 9 2.22ZM11 2v5a2 2 0 0 1-2 2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2 2 2 0 0 0 2 2h12a2 2 0 0 0 2-2 2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2V4a2 2 0 0 0-2-2h-7Zm-6 9a1 1 0 0 0-1 1v5a1 1 0 1 0 2 0v-1h.5a2.5 2.5 0 0 0 0-5H5Zm1.5 3H6v-1h.5a.5.5 0 0 1 0 1Zm4.5-3a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h1.376A2.626 2.626 0 0 0 15 15.375v-1.75A2.626 2.626 0 0 0 12.375 11H11Zm1 5v-3h.375a.626.626 0 0 1 .625.626v1.748a.625.625 0 0 1-.626.626H12Zm5-5a1 1 0 0 0-1 1v5a1 1 0 1 0 2 0v-1h1a1 1 0 1 0 0-2h-1v-1h1a1 1 0 1 0 0-2h-2Z" clipRule="evenodd" />
    </svg>
  )
}

// ─── Tab type ──────────────────────────────────────────────────────────
type TabId = "transformer" | "attention"

// ─── Attention Analyzer (BertViz) Tab Content ──────────────────────────
function AttentionAnalyzerTab() {
  const [viewType, setViewType] = useState("model_view")
  const [sentenceA, setSentenceA] = useState("Con thỏ bỗng nhảy vọt lên.")
  const [sentenceB, setSentenceB] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [hasResult, setHasResult] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    if (iframeRef.current) iframeRef.current.srcdoc = ""

    try {
      const formData = new FormData()
      formData.append("view_type", viewType)
      formData.append("sentence_a", sentenceA)
      formData.append("sentence_b", sentenceB)

      const response = await fetch("/api/visualize", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error(`Server returned ${response.status}`)

      const html = await response.text()

      if (iframeRef.current) {
        iframeRef.current.srcdoc = `
          <html>
            <head>
              <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
              <style>
                body {
                  margin: 0; padding: 24px; color: #111827;
                  font-family: 'Inter', system-ui, sans-serif; background: #ffffff;
                }
                select {
                  background: #ffffff; color: #374151; border: 1px solid #d1d5db;
                  border-radius: 6px; padding: 4px 8px;
                  font-family: 'Inter', system-ui, sans-serif; font-size: 13px;
                  outline: none; transition: border-color 0.2s;
                }
                select:focus { border-color: #8b5cf6; box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.15); }
                text { fill: #374151 !important; font-size: 13px !important; }
                .attention-header { color: #374151 !important; }
                #vis { color: #374151 !important; }
              </style>
            </head>
            <body>${html}</body>
          </html>
        `
        setHasResult(true)
      }
    } catch (err: any) {
      if (iframeRef.current) {
        iframeRef.current.srcdoc = `<body style="color:#ef4444; font-family:'Inter',sans-serif; padding: 24px;"><h3>Lỗi khi tạo trực quan hóa</h3><p>${err.message}</p></body>`
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Input bar */}
      <div className="flex-shrink-0 px-6 lg:px-10 py-3 flex items-center gap-2 border-b border-gray-100 bg-white">
        <form onSubmit={handleSubmit} className="w-full flex items-center gap-2">
          {/* View type */}
          <Select value={viewType} onValueChange={(val) => val && setViewType(val)}>
            <SelectTrigger
              id="view-type-select"
              className="w-auto min-w-[160px] flex-shrink-0 bg-white border-gray-300 text-gray-900 text-sm rounded-l-lg rounded-r-none hover:bg-gray-100 transition-colors focus:outline-none"
            >
              <SelectValue placeholder="Chọn góc nhìn" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 text-gray-900">
              <SelectItem value="model_view" className="text-gray-900 focus:bg-gray-100">Model View</SelectItem>
              <SelectItem value="head_view" className="text-gray-900 focus:bg-gray-100">Head View</SelectItem>
            </SelectContent>
          </Select>

          {/* Sentence A */}
          <div className="flex-1 flex items-center border border-l-0 border-gray-300 rounded-r-lg overflow-hidden bg-white focus-within:border-purple-400 transition-all">
            <input
              id="sentence-a-input"
              type="text"
              value={sentenceA}
              onChange={(e) => setSentenceA(e.target.value)}
              placeholder="Nhập câu để phân tích attention..."
              required
              className="flex-1 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 bg-transparent border-none outline-none"
            />
          </div>

          {/* Sentence B */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Label className="text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">
              Câu B
            </Label>
            <input
              id="sentence-b-input"
              type="text"
              value={sentenceB}
              onChange={(e) => setSentenceB(e.target.value)}
              placeholder="Tùy chọn..."
              className="w-48 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 bg-white border border-gray-200 rounded-lg outline-none focus:border-purple-300 transition-all"
            />
          </div>

          {/* Generate */}
          <button
            id="generate-button"
            type="submit"
            disabled={isLoading}
            className={`flex-shrink-0 px-4 py-2 text-sm rounded-lg border shadow-sm transition-all duration-200 font-medium ${
              isLoading
                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                : "bg-white text-gray-900 border-gray-300 hover:border-purple-400 hover:text-purple-600 focus:border-purple-500 focus:text-purple-600"
            }`}
          >
            {isLoading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Đang xử lý...
              </span>
            ) : (
              "Generate"
            )}
          </button>
        </form>

        {/* PhoBERT badge */}
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 rounded-full px-3 py-1.5 border border-gray-200 flex-shrink-0 ml-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
          </span>
          PhoBERT
        </div>
      </div>

      {/* Visualization area */}
      <div className="flex-1 relative min-h-0">
        {!hasResult && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 pointer-events-none select-none">
            <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 border border-gray-100 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-purple-300" />
            </div>
            <p className="text-lg font-medium text-gray-500 mb-1">Trực quan hóa Attention</p>
            <p className="text-sm text-gray-400">
              Nhập câu và nhấn <span className="font-medium text-gray-500">"Generate"</span> để phân tích attention patterns
            </p>
          </div>
        )}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border-2 border-purple-100 border-t-purple-500 animate-spin"></div>
              <p className="text-sm text-gray-500 font-medium">Đang tính toán attention...</p>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          className="w-full h-full border-none bg-white"
          title="BertViz Output"
          id="bertviz-output"
          style={{ minHeight: "calc(100vh - 160px)" }}
        />
      </div>
    </div>
  )
}

// ─── Transformer Explorer Tab Content ──────────────────────────────────
// Svelte app mounted directly into the DOM — no iframe, no separate port.
import SvelteMount from "./SvelteMount"

function TransformerExplorerTab() {
  return (
    <div className="flex-1 relative min-h-0">
      <SvelteMount />
    </div>
  )
}

// ─── Main App ──────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("transformer")
  const [topBarSolid, setTopBarSolid] = useState(false)

  useEffect(() => {
    const handleScroll = () => setTopBarSolid(window.scrollY > 10)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const tabs: { id: TabId; label: string; sublabel: string }[] = [
    { id: "transformer", label: "Transformer Explorer", sublabel: "GPT-2 Vietnamese" },
    { id: "attention", label: "Attention Analyzer", sublabel: "PhoBERT" },
  ]

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      {/* ═════════════════════════════════════════════════════════════
          TOP BAR — unified branding with tab navigation
         ═════════════════════════════════════════════════════════════ */}
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-200 ${
          topBarSolid
            ? "bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-100"
            : "bg-gradient-to-b from-white via-white/90 to-white/0"
        }`}
      >
        <div className="flex items-center gap-4 px-6 lg:px-10 py-2 pb-0">
          {/* Logo */}
          <div className="flex-shrink-0 select-none whitespace-nowrap">
            <h1
              className="text-[1.6rem] leading-none font-normal tracking-tight"
              style={{ fontFamily: "'Jersey 10', sans-serif" }}
            >
              <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                V<span style={{ fontSize: "1.4rem" }}>IETNAMESE</span>{" "}
                NLP V<span style={{ fontSize: "1.4rem" }}>ISUALIZER</span>
              </span>
            </h1>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right icons */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <a
              href="https://arxiv.org/abs/2408.04619"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-900 transition-colors"
              aria-label="Paper PDF"
            >
              <PdfIcon className="h-5 w-5" />
            </a>
            <a
              href="https://github.com/poloclub/transformer-explainer"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-900 transition-colors"
              aria-label="GitHub"
            >
              <GithubIcon className="h-5 w-5" />
            </a>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex px-6 lg:px-10" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-button relative px-5 py-2.5 text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                activeTab === tab.id
                  ? "text-gray-900"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] font-normal px-1.5 py-0.5 rounded-full border ${
                activeTab === tab.id
                  ? "bg-purple-50 text-purple-600 border-purple-200"
                  : "bg-gray-50 text-gray-400 border-gray-200"
              }`}>
                {tab.sublabel}
              </span>
              {/* Active indicator */}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
              )}
            </button>
          ))}
        </nav>
      </header>

      {/* ═════════════════════════════════════════════════════════════
          MAIN CONTENT — tab panels
         ═════════════════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col min-h-0">
        {/* Keep both tabs mounted for instant switching; hide inactive via CSS */}
        <div className={`flex-1 flex flex-col ${activeTab === "transformer" ? "" : "hidden"}`}>
          <TransformerExplorerTab />
        </div>
        <div className={`flex-1 flex flex-col ${activeTab === "attention" ? "" : "hidden"}`}>
          <AttentionAnalyzerTab />
        </div>
      </main>
    </div>
  )
}
