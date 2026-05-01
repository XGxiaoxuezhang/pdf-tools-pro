import React, { useState } from "react";
import Icon from "../components/Icon";
import { Document, Page, pdfjs } from "react-pdf";
import { reorderPdf } from "../lib/pdfCore";
import { addTask } from "../lib/taskStore";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export default function PdfReorder() {
  const [file, setFile] = useState(null);
  const [filePath, setFilePath] = useState("");
  const [pdfUrl, setPdfUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageOrder, setPageOrder] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);

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

  const handleLoadSuccess = ({ numPages: n }) => {
    setNumPages(n);
    setPageOrder(Array.from({ length: n }, (_, i) => i));
  };

  const handleDragStart = (index) => setDragIndex(index);

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const newOrder = [...pageOrder];
    const [moved] = newOrder.splice(dragIndex, 1);
    newOrder.splice(index, 0, moved);
    setPageOrder(newOrder);
    setDragIndex(index);
  };

  const handleDragEnd = () => setDragIndex(null);

  const executeReorder = async () => {
    if (!file || pageOrder.length === 0) return;
    setIsProcessing(true);
    try {
      let buffer;
      if (window.electronAPI && filePath) {
        buffer = await window.electronAPI.readFile(filePath);
      } else if (file.arrayBuffer) {
        buffer = await file.arrayBuffer();
      }
      const result = await reorderPdf(buffer, pageOrder);

      if (window.electronAPI) {
        const defaultName = file.name.replace(/\.[^/.]+$/, "") + "_已重排.pdf";
        const { canceled, filePath: savePath } = await window.electronAPI.showSaveDialog({
          title: "保存重排后的 PDF",
          defaultPath: defaultName,
          filters: [{ name: "PDF Files", extensions: ["pdf"] }],
        });
        if (!canceled && savePath) {
          const res = await window.electronAPI.saveFile(savePath, result);
          if (res.success) {
            addTask({ file: file.name, action: "页面重排", size: `${numPages} 页`, progress: 100, status: "已完成" });
            alert("重排成功！");
            setFile(null); setFilePath(""); setPdfUrl(null); setPageOrder([]);
          } else {
            alert("保存失败：" + res.error);
          }
        }
      }
    } catch (err) {
      console.error(err);
      alert("重排失败，请检查文件是否损坏。");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-full flex-col p-6 overflow-auto">
      <div className="mb-6 shrink-0">
        <h1 className="text-2xl font-black text-slate-900">PDF 页面重排</h1>
        <p className="mt-1 text-sm text-slate-500">拖拽调整页面顺序，保存为新文件。</p>
      </div>

      {!file ? (
        <div
          className="flex flex-1 flex-col items-center justify-center text-center rounded-3xl border-2 border-dashed border-slate-300 bg-white/50 p-6 transition hover:border-red-400 hover:bg-red-50/50"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
            <Icon name="layers" size={40} />
          </div>
          <h3 className="text-xl font-bold text-slate-900">拖拽 PDF 文件到此处</h3>
          <p className="mt-2 text-slate-500">或点击下方按钮选择文件</p>
          <button onClick={handleSelectFiles} className="mt-6 rounded-2xl bg-slate-900 px-6 py-3 font-bold text-white shadow-lg transition hover:bg-slate-800">
            选择文件
          </button>
        </div>
      ) : (
        <div className="flex flex-1 gap-6 min-h-0">
          <div className="flex-1 overflow-auto rounded-3xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-slate-700">{file.name} — {numPages} 页</span>
              <button onClick={() => { setFile(null); setFilePath(""); setPdfUrl(null); setPageOrder([]); }} className="text-sm font-bold text-slate-400 hover:text-red-600">重新选择</button>
            </div>
            {pdfUrl && (
              <Document file={pdfUrl} onLoadSuccess={handleLoadSuccess} loading={<div className="text-slate-500 font-bold p-8">加载中...</div>}>
                <div className="grid grid-cols-3 gap-4">
                  {pageOrder.map((pageIdx, pos) => (
                    <div
                      key={pageIdx}
                      draggable
                      onDragStart={() => handleDragStart(pos)}
                      onDragOver={(e) => handleDragOver(e, pos)}
                      onDragEnd={handleDragEnd}
                      className={`relative cursor-grab active:cursor-grabbing rounded-xl border-2 overflow-hidden transition ${dragIndex === pos ? "border-red-500 shadow-lg scale-105" : "border-slate-200 hover:border-red-300"}`}
                    >
                      <div className="p-2">
                        <Page pageNumber={pageIdx + 1} scale={0.3} renderTextLayer={false} renderAnnotationLayer={false} />
                      </div>
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        第 {pageIdx + 1} 页 → 位置 {pos + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </Document>
            )}
          </div>

          <div className="w-[260px] shrink-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
            <h3 className="font-bold text-slate-900 text-lg">操作说明</h3>
            <div className="mt-4 flex-1 text-sm text-slate-600 space-y-3">
              <p>拖拽页面缩略图调整顺序。</p>
              <p>页面下方显示"原始页码 → 新位置"。</p>
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-700">
                全程本地处理，不会上传文件。
              </div>
            </div>
            <button
              onClick={executeReorder}
              disabled={isProcessing}
              className={`mt-auto w-full rounded-2xl px-4 py-4 font-bold text-white shadow-lg transition ${isProcessing ? "bg-slate-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 hover:shadow-red-600/20"}`}
            >
              {isProcessing ? "处理中..." : "保存重排结果"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
