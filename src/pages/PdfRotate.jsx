import React, { useState } from "react";
import Icon from "../components/Icon";
import { rotatePdf } from "../lib/pdfCore";
import { addTask } from "../lib/taskStore";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export default function PdfRotate() {
  const [file, setFile] = useState(null);
  const [filePath, setFilePath] = useState("");
  const [pdfUrl, setPdfUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [angle, setAngle] = useState(90);
  const [scope, setScope] = useState("all");
  const [selectedPages, setSelectedPages] = useState(new Set());

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
        setSelectedPages(new Set());
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
      setSelectedPages(new Set());
      if (dropped.path) await loadPdf(dropped.path);
    }
  };

  const handleLoadSuccess = ({ numPages: n }) => {
    setNumPages(n);
  };

  const togglePage = (idx) => {
    setSelectedPages(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const isPageRotated = (idx) => {
    if (scope === "all") return true;
    if (scope === "odd") return idx % 2 === 0;
    if (scope === "even") return idx % 2 === 1;
    if (scope === "custom") return selectedPages.has(idx);
    return false;
  };

  const executeRotate = async () => {
    if (!file) return alert("请先选择 PDF 文件！");
    if (scope === "custom" && selectedPages.size === 0) return alert("请先选择要旋转的页面！");
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

      const srcPdf = await (await import("pdf-lib")).PDFDocument.load(buffer);
      const totalPages = srcPdf.getPageCount();
      let indices = null;
      if (scope === "odd") {
        indices = Array.from({ length: totalPages }, (_, i) => i).filter(i => i % 2 === 0);
      } else if (scope === "even") {
        indices = Array.from({ length: totalPages }, (_, i) => i).filter(i => i % 2 === 1);
      } else if (scope === "custom") {
        indices = Array.from(selectedPages).sort((a, b) => a - b);
      }

      const result = await rotatePdf(buffer, angle, indices);

      if (window.electronAPI) {
        const defaultName = file.name.replace(/\.[^/.]+$/, "") + "_已旋转.pdf";
        const { canceled, filePath: savePath } = await window.electronAPI.showSaveDialog({
          title: "保存旋转后的 PDF",
          defaultPath: defaultName,
          filters: [{ name: "PDF Files", extensions: ["pdf"] }],
        });
        if (!canceled && savePath) {
          const res = await window.electronAPI.saveFile(savePath, result);
          if (res.success) {
            const scopeLabel = scope === "custom" ? `${selectedPages.size} 页` : scope === "all" ? `${totalPages} 页` : scope === "odd" ? "奇数页" : "偶数页";
            addTask({ file: file.name, action: `旋转 ${angle}°`, size: scopeLabel, progress: 100, status: "已完成" });
            alert("旋转成功！");
            setFile(null); setFilePath(""); setPdfUrl(null); setSelectedPages(new Set());
          } else {
            alert("保存失败：" + res.error);
          }
        }
      }
    } catch (err) {
      console.error(err);
      alert("旋转失败，请检查文件是否损坏。");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-full flex-col p-6 overflow-auto">
      <div className="mb-6 shrink-0">
        <h1 className="text-2xl font-black text-slate-900">PDF 旋转</h1>
        <p className="mt-1 text-sm text-slate-500">旋转 PDF 页面方向，支持全部/奇数/偶数/指定页。</p>
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
                <Icon name="settings" size={40} />
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
                <button onClick={() => { setFile(null); setFilePath(""); setPdfUrl(null); setSelectedPages(new Set()); }} className="text-sm font-bold text-slate-400 hover:text-red-600">重新选择</button>
              </div>
              {pdfUrl && (
                <Document file={pdfUrl} onLoadSuccess={handleLoadSuccess} loading={<div className="text-slate-500 font-bold p-8">加载中...</div>}>
                  <div className="grid grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: numPages || 0 }, (_, i) => i).map((idx) => {
                      const rotated = isPageRotated(idx);
                      return (
                        <div
                          key={idx}
                          onClick={() => { if (scope === "custom") togglePage(idx); }}
                          className={`relative rounded-xl border-2 overflow-visible transition cursor-pointer ${scope === "custom" && selectedPages.has(idx) ? "border-red-500 shadow-lg ring-2 ring-red-200" : rotated ? "border-orange-300 bg-orange-50/30" : "border-slate-200 hover:border-red-300"}`}
                        >
                          <div className="p-2 flex items-center justify-center" style={{ minHeight: 100 }}>
                            <div style={{ transform: `rotate(${rotated ? angle : 0}deg)`, transition: "transform 0.3s ease" }}>
                              <Page pageNumber={idx + 1} scale={0.25} renderTextLayer={false} renderAnnotationLayer={false} />
                            </div>
                          </div>
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-bold px-2 py-0.5 rounded-full z-10">
                            第 {idx + 1} 页
                          </div>
                          {rotated && (
                            <div className="absolute top-1 left-1 text-xs font-bold px-1.5 py-0.5 rounded bg-orange-500 text-white z-10">
                              {angle}°
                            </div>
                          )}
                          {scope === "custom" && selectedPages.has(idx) && (
                            <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 flex items-center justify-center z-10">
                              <Icon name="check" size={12} className="text-white" />
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
          <h3 className="font-bold text-slate-900 text-lg">旋转设置</h3>
          <div className="mt-6 flex-1 space-y-5 text-sm text-slate-600">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">旋转角度</label>
              <div className="grid grid-cols-3 gap-2">
                {[90, 180, 270].map(a => (
                  <button key={a} onClick={() => setAngle(a)} className={`rounded-xl px-3 py-3 text-sm font-bold border transition ${angle === a ? "bg-red-50 text-red-600 border-red-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                    {a}°
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">旋转范围</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "all", label: "全部页" },
                  { key: "odd", label: "奇数页" },
                  { key: "even", label: "偶数页" },
                  { key: "custom", label: "指定页" },
                ].map(s => (
                  <button key={s.key} onClick={() => setScope(s.key)} className={`rounded-xl px-3 py-3 text-sm font-bold border transition ${scope === s.key ? "bg-red-50 text-red-600 border-red-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                    {s.label}
                  </button>
                ))}
              </div>
              {scope === "custom" && (
                <p className="mt-2 text-xs text-slate-400">点击左侧页面缩略图选中要旋转的页面（已选 {selectedPages.size} 页）</p>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
              <p className="text-blue-700 text-xs leading-5">
                旋转操作会修改 PDF 内的页面方向，适用于扫描件方向不对的情况。全程本地处理。
              </p>
            </div>
          </div>
          <button
            onClick={executeRotate}
            disabled={!file || isProcessing}
            className={`mt-auto w-full rounded-2xl px-4 py-4 font-bold text-white shadow-lg transition ${!file || isProcessing ? "bg-slate-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 hover:shadow-red-600/20"}`}
          >
            {isProcessing ? "处理中..." : "执行旋转"}
          </button>
        </div>
      </div>
    </div>
  );
}
