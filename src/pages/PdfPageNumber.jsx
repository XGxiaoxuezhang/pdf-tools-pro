import React, { useState } from "react";
import Icon from "../components/Icon";
import { addTask } from "../lib/taskStore";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

const POSITIONS = [
  { key: "bottom-center", label: "底部居中", x: "center", y: "bottom" },
  { key: "bottom-left", label: "底部左侧", x: "left", y: "bottom" },
  { key: "bottom-right", label: "底部右侧", x: "right", y: "bottom" },
  { key: "top-center", label: "顶部居中", x: "center", y: "top" },
  { key: "top-left", label: "顶部左侧", x: "left", y: "top" },
  { key: "top-right", label: "顶部右侧", x: "right", y: "top" },
];

const MODES = [
  { key: "page-number", label: "页码" },
  { key: "header-footer", label: "页眉/页脚" },
];

function getPreviewStyle(position) {
  const pos = POSITIONS.find(p => p.key === position) || POSITIONS[0];
  const style = { position: "absolute", fontSize: 11, fontWeight: "bold", pointerEvents: "none" };
  if (pos.y === "top") style.top = 8; else style.bottom = 8;
  if (pos.x === "center") { style.left = "50%"; style.transform = "translateX(-50%)"; }
  else if (pos.x === "left") style.left = 12;
  else style.right = 12;
  return style;
}

export default function PdfPageNumber() {
  const [file, setFile] = useState(null);
  const [filePath, setFilePath] = useState("");
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState("page-number");
  const [position, setPosition] = useState("bottom-center");
  const [fontSize, setFontSize] = useState(12);
  const [color, setColor] = useState("#333333");
  const [startPage, setStartPage] = useState(1);
  const [headerText, setHeaderText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [numPages, setNumPages] = useState(null);

  const loadPdf = async (path) => {
    if (window.electronAPI && path) {
      const buffer = await window.electronAPI.readFile(path);
      const blob = new Blob([buffer], { type: "application/pdf" });
      setPdfUrl(URL.createObjectURL(blob));
    }
  };

  const handleSelectFiles = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.showOpenDialog({
        properties: ["openFile"],
        filters: [{ name: "PDF Files", extensions: ["pdf"] }],
      });
      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        const path = result.filePaths[0];
        const name = path.split('\\').pop().split('/').pop();
        setFilePath(path);
        setFile({ name, size: 0 });
        await loadPdf(path);
      }
    }
  };

  const handleFileDrop = async (e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).find(f => f.type === "application/pdf" || f.name.endsWith(".pdf"));
    if (dropped) {
      setFile(dropped);
      setFilePath(dropped.path || "");
      if (dropped.path) await loadPdf(dropped.path);
    }
  };

  const previewText = mode === "page-number"
    ? `${startPage} / ${(numPages || 1) + startPage - 1}`
    : (footerText || headerText || "").replace("{page}", String(startPage)).replace("{total}", String(numPages || 1));

  const showHeader = mode === "header-footer" && headerText.trim();
  const showFooter = mode === "header-footer" && footerText.trim();
  const showPageNum = mode === "page-number";

  const executeAdd = async () => {
    if (!file) return alert("请先选择 PDF 文件！");
    if (mode === "header-footer" && !headerText.trim() && !footerText.trim()) return alert("请输入页眉或页脚文字！");
    setIsProcessing(true);
    try {
      let buffer;
      if (window.electronAPI && filePath) {
        buffer = await window.electronAPI.readFile(filePath);
      } else if (file.arrayBuffer) {
        buffer = await file.arrayBuffer();
      } else {
        return alert("无法读取文件");
      }

      const pdf = await PDFDocument.load(buffer);
      const pages = pdf.getPages();
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();
        const pageNum = i + startPage;
        const pos = POSITIONS.find(p => p.key === position);

        const calcX = (text) => {
          const textWidth = font.widthOfTextAtSize(text, fontSize);
          if (pos.x === "center") return (width - textWidth) / 2;
          if (pos.x === "right") return width - textWidth - 50;
          return 50;
        };

        if (mode === "page-number") {
          const text = `${pageNum} / ${pages.length + startPage - 1}`;
          page.drawText(text, { x: calcX(text), y: pos.y === "top" ? height - 40 : 30, size: fontSize, font, color: rgb(r, g, b) });
        } else {
          if (headerText.trim()) {
            const text = headerText.replace("{page}", String(pageNum)).replace("{total}", String(pages.length));
            page.drawText(text, { x: calcX(text), y: height - 40, size: fontSize, font, color: rgb(r, g, b) });
          }
          if (footerText.trim()) {
            const text = footerText.replace("{page}", String(pageNum)).replace("{total}", String(pages.length));
            page.drawText(text, { x: calcX(text), y: 30, size: fontSize, font, color: rgb(r, g, b) });
          }
        }
      }

      const resultBytes = await pdf.save();
      const defaultName = file.name.replace(/\.[^/.]+$/, "") + "_已加页码.pdf";
      const { canceled, filePath: savePath } = await window.electronAPI.showSaveDialog({
        title: "保存 PDF",
        defaultPath: defaultName,
        filters: [{ name: "PDF Files", extensions: ["pdf"] }],
      });
      if (!canceled && savePath) {
        const res = await window.electronAPI.saveFile(savePath, resultBytes);
        if (res.success) {
          addTask({ file: file.name, action: mode === "page-number" ? "添加页码" : "添加页眉页脚", size: `${pages.length} 页`, progress: 100, status: "已完成" });
          alert("添加成功！");
          setFile(null); setFilePath(""); setPdfUrl(null);
        } else {
          alert("保存失败：" + res.error);
        }
      }
    } catch (err) {
      console.error(err);
      alert("处理失败，请检查文件是否损坏。");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-full flex-col p-6 overflow-auto">
      <div className="mb-6 shrink-0">
        <h1 className="text-2xl font-black text-slate-900">PDF 页码 / 页眉页脚</h1>
        <p className="mt-1 text-sm text-slate-500">为 PDF 添加页码或自定义页眉页脚，实时预览效果。</p>
      </div>

      <div className="flex flex-1 gap-6 min-h-[400px]">
        <div className="flex-1 flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm overflow-auto">
          {!file ? (
            <div
              className="flex flex-1 flex-col items-center justify-center text-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-6 transition hover:border-red-400 hover:bg-red-50/50"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
                <Icon name="file" size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">拖拽 PDF 文件到此处</h3>
              <p className="mt-2 text-slate-500">或点击右侧按钮选择文件</p>
              <button onClick={handleSelectFiles} className="mt-6 rounded-2xl bg-slate-900 px-6 py-3 font-bold text-white shadow-lg transition hover:bg-slate-800">
                选择文件
              </button>
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-slate-700">{file.name} — {numPages} 页</span>
                <button onClick={() => { setFile(null); setFilePath(""); setPdfUrl(null); }} className="text-sm font-bold text-slate-400 hover:text-red-600">重新选择</button>
              </div>
              {pdfUrl && (
                <div className="flex-1 flex items-center justify-center overflow-auto">
                  <div className="relative inline-block shadow-lg rounded-lg overflow-hidden">
                    <Document file={pdfUrl} onLoadSuccess={({ numPages: n }) => setNumPages(n)} loading={<div className="text-slate-500 font-bold p-8">加载中...</div>}>
                      <Page pageNumber={1} scale={0.5} renderTextLayer={false} renderAnnotationLayer={false} />
                    </Document>
                    {/* Preview overlay */}
                    {showPageNum && (
                      <div style={{ ...getPreviewStyle(position), color }} className="bg-white/80 px-2 py-0.5 rounded text-xs">
                        {previewText}
                      </div>
                    )}
                    {showHeader && (
                      <div style={{ ...getPreviewStyle("top-center"), color }} className="bg-white/80 px-2 py-0.5 rounded text-xs">
                        {headerText.replace("{page}", String(startPage)).replace("{total}", String(numPages || 1))}
                      </div>
                    )}
                    {showFooter && (
                      <div style={{ ...getPreviewStyle("bottom-center"), color }} className="bg-white/80 px-2 py-0.5 rounded text-xs">
                        {footerText.replace("{page}", String(startPage)).replace("{total}", String(numPages || 1))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-[300px] shrink-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-900 text-lg">设置</h3>
          <div className="mt-4 flex-1 space-y-4 text-sm text-slate-600">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">模式</label>
              <div className="grid grid-cols-2 gap-2">
                {MODES.map(m => (
                  <button key={m.key} onClick={() => setMode(m.key)} className={`rounded-xl px-3 py-2 text-sm font-bold border transition ${mode === m.key ? "bg-red-50 text-red-600 border-red-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {mode === "page-number" ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">位置</label>
                  <div className="grid grid-cols-3 gap-2">
                    {POSITIONS.map(p => (
                      <button key={p.key} onClick={() => setPosition(p.key)} className={`rounded-xl px-2 py-2 text-xs font-bold border transition ${position === p.key ? "bg-red-50 text-red-600 border-red-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">起始页码</label>
                  <input type="number" min="1" value={startPage} onChange={(e) => setStartPage(Number(e.target.value))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-slate-900 outline-none focus:border-red-500" />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">页眉文字</label>
                  <input type="text" value={headerText} onChange={(e) => setHeaderText(e.target.value)} placeholder="留空不添加，{page} 当前页" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-slate-900 outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">页脚文字</label>
                  <input type="text" value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="留空不添加，{total} 总页数" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-slate-900 outline-none focus:border-red-500" />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">字号: {fontSize}</label>
              <input type="range" min="8" max="24" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-full accent-red-600" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">颜色</label>
              <div className="flex items-center gap-3">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer" />
                <span className="text-xs text-slate-400 font-mono">{color}</span>
              </div>
            </div>
          </div>
          <button
            onClick={executeAdd}
            disabled={!file || isProcessing}
            className={`mt-auto w-full rounded-2xl px-4 py-4 font-bold text-white shadow-lg transition ${!file || isProcessing ? "bg-slate-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 hover:shadow-red-600/20"}`}
          >
            {isProcessing ? "处理中..." : "添加"}
          </button>
        </div>
      </div>
    </div>
  );
}
