import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

export default function App() {
  const [viewType, setViewType] = useState("model_view")
  const [sentenceA, setSentenceA] = useState("Con thỏ bỗng nhảy vọt lên.")
  const [sentenceB, setSentenceB] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    // Clear iframe temporarily
    if (iframeRef.current) iframeRef.current.srcdoc = ""

    try {
      const formData = new FormData()
      formData.append("view_type", viewType)
      formData.append("sentence_a", sentenceA)
      formData.append("sentence_b", sentenceB)

      const response = await fetch("http://127.0.0.1:8000/visualize", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`)
      }

      const html = await response.text()
      
      if (iframeRef.current) {
        iframeRef.current.srcdoc = `
          <html>
            <head>
              <style>
                body { margin: 0; padding: 20px; color: #f8fafc; font-family: 'Inter', system-ui, sans-serif; }
                select { background: #1e293b; color: white; border: 1px solid #3b82f6; border-radius: 4px; padding: 4px; }
                text { fill: #e2e8f0 !important; font-size: 14px !important; }
                .attention-header { color: #e2e8f0 !important; }
                #vis { color: #e2e8f0 !important; }
              </style>
            </head>
            <body>${html}</body>
          </html>
        `
      }
    } catch (err: any) {
      if (iframeRef.current) {
         iframeRef.current.srcdoc = `<body style="color:red; font-family:sans-serif;">Error computing visualization: ${err.message}</body>`
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center">
      <header className="w-full text-center py-10 bg-slate-900 border-b border-slate-800">
        <h1 className="text-4xl font-extrabold pb-2 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          BertViz
        </h1>
        <p className="text-slate-400">Trực quan hóa Attention cho mô hình Transformer (PhoBERT).</p>
        <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 bg-slate-800 rounded-full text-blue-300">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          PhoBERT Đã Kết Nối
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl px-4 py-8 grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8">
        {/* Controls Column */}
        <aside className="flex flex-col gap-6">
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
            <CardHeader className="text-slate-50">
              <CardTitle className="text-slate-50">Cấu hình Trực quan hóa</CardTitle>
              <CardDescription className="text-slate-400">Điều chỉnh các tham số cho mô hình.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                
                <div className="flex flex-col gap-3">
                  <Label className="text-slate-200">Loại Trực quan hóa</Label>
                  <Select value={viewType} onValueChange={(val) => val && setViewType(val)}>
                    <SelectTrigger className="bg-slate-950/50 border-slate-700 text-slate-50">
                      <SelectValue placeholder="Chọn góc nhìn" className="text-slate-50" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-slate-50">
                      <SelectItem value="model_view" className="text-slate-50 focus:bg-slate-800">Góc nhìn Mô hình (Tổng quan)</SelectItem>
                      <SelectItem value="head_view" className="text-slate-50 focus:bg-slate-800">Góc nhìn Head (Chi tiết)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-3">
                  <Label className="text-slate-200">Câu A</Label>
                  <Textarea 
                    value={sentenceA} 
                    onChange={(e) => setSentenceA(e.target.value)}
                    placeholder="Nhập câu đầu tiên..."
                    required
                    className="min-h-[100px] bg-slate-950/50 border-slate-700 focus-visible:ring-blue-500 text-slate-50 placeholder:text-slate-500"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <Label className="text-slate-200">Câu B (Tùy chọn)</Label>
                  <Textarea 
                    value={sentenceB} 
                    onChange={(e) => setSentenceB(e.target.value)}
                    placeholder="Nhập câu thứ hai cho cross-attention..."
                    className="min-h-[100px] bg-slate-950/50 border-slate-700 focus-visible:ring-blue-500 text-slate-50 placeholder:text-slate-500"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-500/20"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLoading ? "Đang tạo bản đồ..." : "Tạo Trực quan hóa"}
                </Button>

              </form>
            </CardContent>
          </Card>
        </aside>

        {/* Viewport Column */}
        <section className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden relative shadow-2xl flex flex-col min-h-[600px] lg:min-h-full">
          {!isLoading && !iframeRef.current?.srcdoc && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 pointer-events-none">
              <span className="text-4xl mb-4">✨</span>
              <p>Nhập văn bản để xem bản đồ attention</p>
            </div>
          )}
          
          <iframe 
            ref={iframeRef} 
            className="w-full h-full min-h-[600px] border-none flex-1 bg-transparent"
            title="BertViz Output"
          />
        </section>
      </main>
    </div>
  )
}
