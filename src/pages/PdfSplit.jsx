import React, { useState, useMemo } from "react";
import Icon from "../components/Icon";
import { PDFDocument } from "pdf-lib";
import { addTask } from "../lib/taskStore";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export default function PdfSplit() {
  const [file, setFile] = useState(null);
  const [filePath, setFilePath] = useState("");
  const [pdfUrl, setPdfUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [splitMode, setSplitMode] = useState("fixed");
  const [fixedPages, setFixedPages] = useState(1);
  const [pageRanges, setPageRanges] = useState("");

  const loadPdf = async (f, path) => {
    let buffer;
    if (window.electronAPI && path) {
      buffer = await window.electronAPI.readFile(path);
    } else if (f.arrayBuffer) {
      buffer = await f.arrayBuffer();
    }
    if (buffer) {
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
        await loadPdf({ name }, path);
      }
    }
  };

  const handleFileDrop = async (e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).find(f => f.type === "application/pdf" || f.name.endsWith(".pdf"));
    if (dropped) {
      setFile(dropped);
      setFilePath(dropped.path || "");
      await loadPdf(dropped, dropped.path);
    }
  };

  const parseRanges = (rangeStr, maxPage) => {
    const pages = new Set();
    const parts = rangeStr.split(/[,，]/);
    for (let part of parts) {
      part = part.trim();
      if (!part) continue;
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = parseInt(startStr);
        const end = parseInt(endStr);
        if (isNaN(start) || isNaN(end)) {
          alert(`"${part}" 不是有效的页码范围，请输入数字。`);
          return [];
        }
        if (start > end) {
          alert(`页码范围 "${part}" 起始页不能大于结束页。`);
          return [];
        }
        for (let i = start; i <= end; i++) {
          if (i >= 1 && i <= maxPage) pages.add(i);
        }
      } else {
        const num = parseInt(part);
        if (isNaN(num)) {
          alert(`"${part}" 不是有效的页码，请输入数字。`);
          return [];
        }
        if (num >= 1 && num <= maxPage) pages.add(num);
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  };

  // Compute which pages are highlighted
  const highlightedPages = useMemo(() => {
    if (!numPages) return new Set();
    if (splitMode === "extract") {
      return new Set(parseRanges(pageRanges, numPages));
    }
    return new Set();
  }, [splitMode, pageRanges, numPages]);

  const splitGroups = useMemo(() => {
    if (!numPages || splitMode !== "fixed") return [];
    const groups = [];
    for (let i = 0; i < numPages; i += fixedPages) {
      groups.push({ start: i + 1, end: Math.min(i + fixedPages, numPages) });
    }
    return groups;
  }, [numPages, fixedPages, splitMode]);

  const executeSplit = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      let buffer;
      if (window.electronAPI && filePath) {
        buffer = await window.electronAPI.readFile(filePath);
      } else if (file.arrayBuffer) {
        buffer = await file.arrayBuffer();
      }
      const pdf = await PDFDocument.load(buffer);
      const totalPages = pdf.getPageCount();
      const splitDocs = [];

      if (splitMode === "fixed") {
        let i = 0;
        while (i < totalPages) {
          const chunk = await PDFDocument.create();
          const end = Math.min(i + fixedPages, totalPages);
          const indices = Array.from({ length: end - i }, (_, k) => i + k);
          const copiedPages = await chunk.copyPages(pdf, indices);
          copiedPages.forEach(p => chunk.addPage(p));
          splitDocs.push(await chunk.save());
          i = end;
        }
      } else if (splitMode === "extract") {
        const indices = parseRanges(pageRanges, totalPages).map(p => p - 1);
        if (indices.length === 0) {
          alert(`无效的页码范围。原文档共 ${totalPages} 页。`);
          setIsProcessing(false);
          return;
        }
        const chunk = await PDFDocument.create();
        const copiedPages = await chunk.copyPages(pdf, indices);
        copiedPages.forEach(p => chunk.addPage(p));
        splitDocs.push(await chunk.save());
      }

      if (window.electronAPI) {
        if (splitMode === "fixed") {
          const { canceled, filePaths } = await window.electronAPI.showOpenDialog({
            title: "选择拆分文件保存目录",
            properties: ["openDirectory"]
          });
          if (!canceled && filePaths && filePaths[0]) {
            const dir = filePaths[0];
            for (let j = 0; j < splitDocs.length; j++) {
              const fileName = `${file.name.replace(/\.[^/.]+$/, "")}_部分_${j + 1}.pdf`;
              const savePath = dir + (dir.includes('/') ? '/' : '\\') + fileName;
              await window.electronAPI.saveFile(savePath, splitDocs[j]);
            }
            alert(`成功！已拆分为 ${splitDocs.length} 个文件。`);
            addTask({ file: file.name, action: "批量拆分", size: `${splitDocs.length} 个文件`, progress: 100, status: "已完成" });
            setFile(null); setFilePath(""); setPdfUrl(null);
          }
        } else {
          const defaultName = file.name.replace(/\.[^/.]+$/, "") + "_提取.pdf";
          const { canceled, filePath: savePath } = await window.electronAPI.showSaveDialog({
            title: "保存提取后的文件",
            defaultPath: defaultName,
            filters: [{ name: "PDF Files", extensions: ["pdf"] }]
          });
          if (!canceled && savePath) {
            await window.electronAPI.saveFile(savePath, splitDocs[0]);
            alert("成功！提取的文件已保存。");
            addTask({ file: file.name, action: "提取页面", size: pageRanges, progress: 100, status: "已完成" });
            setFile(null); setFilePath(""); setPdfUrl(null);
          }
        }
      }
    } catch (err) {
      console.error(err);
      alert("拆分失败，请检查文件是否损坏或加密。");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-full flex-col p-6 overflow-auto">
      <div className="mb-6 shrink-0">
        <h1 className="text-2xl font-black text-slate-900">PDF 拆分与提取</h1>
        <p className="mt-1 text-sm text-slate-500">按固定页数拆分或提取特定页码，实时预览页面。</p>
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
                <Icon name="scissors" size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">拖拽 PDF 文件到此处</h3>
              <p className="mt-2 text-slate-500">或点击下方按钮选择文件</p>
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
                <Document file={pdfUrl} onLoadSuccess={({ numPages: n }) => setNumPages(n)} loading={<div className="text-slate-500 font-bold p-8">加载中...</div>}>
                  <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
                    {Array.from({ length: numPages || 0 }, (_, i) => i).map((idx) => {
                      const pageNum = idx + 1;
                      const isHighlighted = splitMode === "extract"
                        ? highlightedPages.has(pageNum)
                        : splitGroups.some(g => pageNum >= g.start && pageNum <= g.end);
                      const groupIdx = splitMode === "fixed" ? splitGroups.findIndex(g => pageNum >= g.start && pageNum <= g.end) : -1;
                      const groupColors = ["border-blue-400 bg-blue-50/50", "border-green-400 bg-green-50/50", "border-purple-400 bg-purple-50/50", "border-orange-400 bg-orange-50/50", "border-pink-400 bg-pink-50/50"];
                      const colorClass = groupIdx >= 0 ? groupColors[groupIdx % groupColors.length] : "";

                      return (
                        <div key={idx} className={`relative rounded-lg border-2 overflow-hidden transition ${isHighlighted ? (splitMode === "extract" ? "border-red-400 bg-red-50/50 ring-2 ring-red-200" : colorClass) : "border-slate-200"}`}>
                          <div className="p-1.5">
                            <Page pageNumber={pageNum} scale={0.2} renderTextLayer={false} renderAnnotationLayer={false} />
                          </div>
                          <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                            {pageNum}
                          </div>
                          {isHighlighted && splitMode === "fixed" && groupIdx >= 0 && (
                            <div className="absolute top-0.5 right-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full bg-white/90 shadow-sm" style={{ color: ["#3b82f6", "#22c55e", "#a855f7", "#f97316", "#ec4899"][groupIdx % 5] }}>
                              #{groupIdx + 1}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Document>
              )}
            </div>
          )}
        </div>

        <div className="w-[300px] shrink-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-900 text-lg">拆分设置</h3>
          <div className="mt-6 flex-1 text-sm text-slate-600 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">拆分模式</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setSplitMode("fixed")} className={`rounded-xl px-2 py-2 text-xs font-bold border transition ${splitMode === "fixed" ? "bg-red-50 text-red-600 border-red-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                  固定拆分
                </button>
                <button onClick={() => setSplitMode("extract")} className={`rounded-xl px-2 py-2 text-xs font-bold border transition ${splitMode === "extract" ? "bg-red-50 text-red-600 border-red-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                  提取页面
                </button>
              </div>
            </div>

            {splitMode === "fixed" && (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">每 N 页拆分</label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1">
                  <button onClick={() => setFixedPages(Math.max(1, fixedPages - 1))} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm font-bold text-slate-600 hover:text-red-600">-</button>
                  <input type="number" min="1" value={fixedPages} onChange={e => setFixedPages(Math.max(1, parseInt(e.target.value) || 1))} className="flex-1 bg-transparent text-center font-bold outline-none" />
                  <button onClick={() => setFixedPages(fixedPages + 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm font-bold text-slate-600 hover:text-red-600">+</button>
                </div>
                {numPages && <p className="mt-2 text-xs text-slate-400">将拆分为 {Math.ceil(numPages / fixedPages)} 个文件</p>}
                <div className="mt-3 space-y-1">
                  {splitGroups.map((g, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-white" style={{ backgroundColor: ["#3b82f6", "#22c55e", "#a855f7", "#f97316", "#ec4899"][i % 5] }}>{i + 1}</span>
                      <span className="text-slate-600">第 {g.start}-{g.end} 页</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {splitMode === "extract" && (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">输入页码范围</label>
                <input type="text" value={pageRanges} onChange={(e) => setPageRanges(e.target.value)} placeholder="如: 1, 3, 5-10" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-slate-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" />
                {highlightedPages.size > 0 && <p className="mt-2 text-xs text-red-600">已选 {highlightedPages.size} 页</p>}
              </div>
            )}
          </div>
          <button
            onClick={executeSplit}
            disabled={!file || isProcessing || (splitMode === 'extract' && !pageRanges.trim())}
            className={`mt-auto w-full rounded-2xl px-4 py-4 font-bold text-white shadow-lg transition ${!file || isProcessing || (splitMode === 'extract' && !pageRanges.trim()) ? "bg-slate-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 hover:shadow-red-600/20"}`}
          >
            {isProcessing ? "处理中..." : (splitMode === "fixed" ? "批量拆分" : "提取并保存")}
          </button>
        </div>
      </div>
    </div>
  );
}
