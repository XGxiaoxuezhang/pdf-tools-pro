import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import Icon from "../components/Icon";
import { Document, Page, Outline, pdfjs } from "react-pdf";
import { PDFDocument } from "pdf-lib";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure pdfjs worker
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

function useBlobUrl(buffer) {
  const urlRef = useRef(null);
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    if (buffer) {
      const blob = new Blob([buffer], { type: "application/pdf" });
      urlRef.current = URL.createObjectURL(blob);
    }
    setUrl(urlRef.current);
    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [buffer]);

  return url;
}

export default function PdfViewer() {
  const location = useLocation();
  const [file, setFile] = useState(location.state?.externalFile || null);
  const [fileBuffer, setFileBuffer] = useState(location.state?.externalBuffer || null);
  const pdfUrl = useBlobUrl(fileBuffer);
  const [numPages, setNumPages] = useState(null);
  const [scale, setScale] = useState(1.0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState(null); // null | 'success' | 'error'

  // Batch print: multiple files
  const [batchFiles, setBatchFiles] = useState([]);
  const [showBatchPanel, setShowBatchPanel] = useState(false);
  const batchInputRef = useRef(null);

  const handleFileInput = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const buffer = await selectedFile.arrayBuffer();
      setFileBuffer(buffer);
    }
  };

  const handleFileDrop = async (e) => {
    e.preventDefault();
    const selectedFile = Array.from(e.dataTransfer.files).find(f => f.type === "application/pdf" || f.name.endsWith(".pdf"));
    if (selectedFile) {
      setFile(selectedFile);
      const buffer = await selectedFile.arrayBuffer();
      setFileBuffer(buffer);
    }
  };

  const reloadPdf = async (pdfDoc) => {
    const newBytes = await pdfDoc.save();
    setFileBuffer(newBytes);
  };

  const deletePage = async (pageIndex) => {
    if (!fileBuffer) return;
    setIsProcessing(true);
    try {
      const pdfDoc = await PDFDocument.load(fileBuffer);
      pdfDoc.removePage(pageIndex);
      await reloadPdf(pdfDoc);
    } catch (err) {
      console.error(err);
      alert("删除失败");
    } finally {
      setIsProcessing(false);
    }
  };

  const addBlankPage = async (pageIndex) => {
    if (!fileBuffer) return;
    setIsProcessing(true);
    try {
      const pdfDoc = await PDFDocument.load(fileBuffer);
      pdfDoc.insertPage(pageIndex + 1);
      await reloadPdf(pdfDoc);
    } catch (err) {
      console.error(err);
      alert("添加失败");
    } finally {
      setIsProcessing(false);
    }
  };

  const saveEditedPdf = async () => {
    if (!fileBuffer) return;
    if (window.electronAPI) {
      const { canceled, filePath } = await window.electronAPI.showSaveDialog({
        title: "保存编辑后的 PDF",
        defaultPath: file ? `编辑_${file.name}` : "编辑后的文件.pdf",
        filters: [{ name: "PDF Files", extensions: ["pdf"] }]
      });
      if (!canceled && filePath) {
        await window.electronAPI.saveFile(filePath, fileBuffer);
        alert("保存成功！");
      }
    } else {
      const blob = new Blob([fileBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "已编辑文件.pdf";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // ──────────────────────────────────────────────
  // 打印当前 PDF（整份）
  // ──────────────────────────────────────────────
  const printCurrentPdf = async () => {
    if (!fileBuffer) return;
    setIsPrinting(true);
    setPrintStatus(null);
    try {
      if (window.electronAPI?.printPdf) {
        const result = await window.electronAPI.printPdf(Array.from(new Uint8Array(fileBuffer)));
        setPrintStatus(result.success ? 'success' : 'error');
      } else {
        // Fallback: browser print via iframe
        const blob = new Blob([fileBuffer], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = url;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          iframe.contentWindow.print();
          setTimeout(() => { document.body.removeChild(iframe); URL.revokeObjectURL(url); }, 1000);
        };
        setPrintStatus('success');
      }
    } catch (err) {
      console.error(err);
      setPrintStatus('error');
    } finally {
      setIsPrinting(false);
      setTimeout(() => setPrintStatus(null), 3000);
    }
  };

  // ──────────────────────────────────────────────
  // 打印单页
  // ──────────────────────────────────────────────
  const printSinglePage = async (pageIndex) => {
    if (!fileBuffer) return;
    setIsProcessing(true);
    try {
      const pdfDoc = await PDFDocument.load(fileBuffer);
      const newDoc = await PDFDocument.create();
      const [copiedPage] = await newDoc.copyPages(pdfDoc, [pageIndex]);
      newDoc.addPage(copiedPage);
      const singlePageBytes = await newDoc.save();

      if (window.electronAPI?.printPdf) {
        await window.electronAPI.printPdf(Array.from(singlePageBytes));
      } else {
        const blob = new Blob([singlePageBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = url;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          iframe.contentWindow.print();
          setTimeout(() => { document.body.removeChild(iframe); URL.revokeObjectURL(url); }, 1000);
        };
      }
    } catch (err) {
      console.error(err);
      alert("单页打印失败");
    } finally {
      setIsProcessing(false);
    }
  };

  // ──────────────────────────────────────────────
  // 批量打印：选多个 PDF，逐一发送打印
  // ──────────────────────────────────────────────
  const handleBatchFilesSelect = (e) => {
    const files = Array.from(e.target.files).filter(f => f.name.endsWith(".pdf"));
    setBatchFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      return [...prev, ...files.filter(f => !existingNames.has(f.name))];
    });
  };

  const removeBatchFile = (index) => {
    setBatchFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startBatchPrint = async () => {
    if (batchFiles.length === 0) return;
    setIsPrinting(true);
    setPrintStatus(null);
    let failCount = 0;
    for (const f of batchFiles) {
      try {
        const buffer = await f.arrayBuffer();
        if (window.electronAPI?.printPdf) {
          const result = await window.electronAPI.printPdf(Array.from(new Uint8Array(buffer)));
          if (!result.success) failCount++;
        }
      } catch {
        failCount++;
      }
    }
    setIsPrinting(false);
    setPrintStatus(failCount === 0 ? 'success' : 'error');
    setTimeout(() => setPrintStatus(null), 3000);
    if (failCount === 0) {
      setBatchFiles([]);
      setShowBatchPanel(false);
    }
  };

  return (
    <div className="flex h-full flex-col p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900">PDF 预览与编辑</h1>
          <p className="mt-1 text-sm text-slate-500">查看、编辑、打印您的 PDF 文档。</p>
        </div>
        <div className="flex items-center gap-2">
          {fileBuffer && (
            <>
              {/* Zoom */}
              <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="rounded-xl bg-white p-2 text-slate-600 shadow-sm border border-slate-200 hover:bg-slate-50" title="缩小">
                <Icon name="minimize" size={16} />
              </button>
              <span className="text-xs text-slate-500 font-mono w-12 text-center">{Math.round(scale * 100)}%</span>
              <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="rounded-xl bg-white p-2 text-slate-600 shadow-sm border border-slate-200 hover:bg-slate-50" title="放大">
                <Icon name="plus" size={16} />
              </button>

              {/* Divider */}
              <div className="h-6 w-px bg-slate-200 mx-1" />

              {/* Print current */}
              <button
                onClick={printCurrentPdf}
                disabled={isPrinting}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-60 transition"
                title="打印整份 PDF"
              >
                <Icon name="printer" size={16} />
                {isPrinting ? "打印中…" : "打印"}
              </button>

              {/* Batch print toggle */}
              <button
                onClick={() => setShowBatchPanel(p => !p)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold shadow-lg transition ${showBatchPanel ? "bg-slate-900 text-white" : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"}`}
                title="批量打印多个 PDF"
              >
                <Icon name="layers" size={16} />
                批量打印
              </button>

              {/* Divider */}
              <div className="h-6 w-px bg-slate-200 mx-1" />

              {/* Save */}
              <button onClick={saveEditedPdf} className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-red-600/20 hover:bg-red-700 transition">
                <Icon name="download" size={16} /> 保存文档
              </button>
            </>
          )}

          {/* Print status toast */}
          {printStatus && (
            <div className={`ml-2 rounded-xl px-4 py-2 text-sm font-bold ${printStatus === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {printStatus === 'success' ? '✓ 已发送打印' : '✗ 打印失败'}
            </div>
          )}
        </div>
      </div>

      {/* Batch Print Panel */}
      {showBatchPanel && (
        <div className="mb-4 shrink-0 rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold text-blue-900 flex items-center gap-2">
              <Icon name="layers" size={18} /> 批量打印队列
              <span className="ml-2 rounded-full bg-blue-200 text-blue-800 text-xs px-2 py-0.5">{batchFiles.length} 个文件</span>
            </div>
            <div className="flex gap-2">
              <label className="cursor-pointer rounded-xl bg-white border border-blue-200 px-3 py-1.5 text-sm font-bold text-blue-700 hover:bg-blue-100 transition">
                + 添加文件
                <input ref={batchInputRef} type="file" accept=".pdf" multiple className="hidden" onChange={handleBatchFilesSelect} />
              </label>
              <button
                onClick={startBatchPrint}
                disabled={batchFiles.length === 0 || isPrinting}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition"
              >
                <Icon name="printer" size={14} />
                {isPrinting ? "打印中…" : `全部打印 (${batchFiles.length})`}
              </button>
            </div>
          </div>
          {batchFiles.length === 0 ? (
            <p className="text-sm text-blue-500 text-center py-4">点击「添加文件」选择要批量打印的 PDF</p>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-40 overflow-auto">
              {batchFiles.map((f, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-white border border-blue-100 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm text-slate-700 truncate">
                    <Icon name="file" size={14} />
                    <span className="truncate max-w-xs">{f.name}</span>
                    <span className="text-xs text-slate-400 shrink-0">{(f.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <button onClick={() => removeBatchFile(i)} className="text-slate-400 hover:text-red-500 ml-3 shrink-0">
                    <Icon name="close" size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main viewer */}
      <div className="flex flex-1 min-h-0 bg-slate-200/50 rounded-3xl overflow-hidden border border-slate-200" onDragOver={(e) => e.preventDefault()} onDrop={handleFileDrop}>
        {!fileBuffer ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center p-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-slate-400 mb-4 shadow-sm">
              <Icon name="search" size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">拖拽 PDF 文件到此处预览</h3>
            <label className="mt-6 cursor-pointer rounded-2xl bg-white border border-slate-200 px-6 py-3 font-bold text-slate-700 shadow-sm transition hover:bg-slate-50">
              选择文件
              <input type="file" accept=".pdf" className="hidden" onChange={handleFileInput} />
            </label>
          </div>
        ) : (
          <Document
            file={pdfUrl}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={<div className="text-slate-500 font-bold">加载 PDF 中...</div>}
            className="flex flex-1 min-h-0"
          >
            {/* Outline sidebar */}
            <div className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
              <div className="p-4 border-b border-slate-100 flex items-center gap-2 font-bold text-slate-800">
                <Icon name="search" size={16} /> 目录导航
              </div>
              <div className="flex-1 overflow-auto p-4 text-sm text-slate-600 custom-outline-container">
                <Outline onItemClick={({ pageNumber }) => {
                  const el = document.getElementById(`page_${pageNumber}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }} />
              </div>
            </div>

            {/* Pages */}
            <div className="flex-1 overflow-auto p-8 flex justify-center relative">
              {isProcessing && <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-sm flex items-center justify-center font-bold text-slate-600">处理中...</div>}
              <div className="flex flex-col gap-8">
                {Array.from(new Array(numPages || 0), (el, index) => (
                  <div key={`page_${index + 1}`} id={`page_${index + 1}`} className="relative group scroll-mt-6">
                    <div className="bg-white shadow-xl rounded-lg overflow-hidden ring-1 ring-slate-900/5 transition-transform hover:scale-[1.01]">
                      <Page
                        pageNumber={index + 1}
                        scale={scale}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                    </div>

                    {/* Floating Action Bar */}
                    <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => printSinglePage(index)}
                        className="bg-white text-slate-700 p-2 rounded-xl shadow-lg ring-1 ring-slate-200 hover:bg-blue-50 hover:text-blue-600"
                        title="打印此页"
                      >
                        <Icon name="printer" size={18} />
                      </button>
                      <button
                        onClick={() => addBlankPage(index)}
                        className="bg-white text-slate-700 p-2 rounded-xl shadow-lg ring-1 ring-slate-200 hover:bg-slate-50 hover:text-blue-600"
                        title="在此页后插入空白页"
                      >
                        <Icon name="file" size={18} />
                      </button>
                      <button
                        onClick={() => deletePage(index)}
                        className="bg-white text-slate-700 p-2 rounded-xl shadow-lg ring-1 ring-slate-200 hover:bg-red-50 hover:text-red-600"
                        title="删除此页"
                      >
                        <Icon name="trash" size={18} />
                      </button>
                    </div>

                    {/* Page number badge */}
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      {index + 1} / {numPages}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Document>
        )}
      </div>
    </div>
  );
}
