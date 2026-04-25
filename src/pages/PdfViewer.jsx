import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Icon from "../components/Icon";
import { Document, Page, Outline, pdfjs } from "react-pdf";
import { PDFDocument } from "pdf-lib";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure pdfjs worker
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export default function PdfViewer() {
  const location = useLocation();
  const [file, setFile] = useState(location.state?.externalFile || null);
  const [fileBuffer, setFileBuffer] = useState(location.state?.externalBuffer || null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [scale, setScale] = useState(1.0);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (fileBuffer) {
      const blob = new Blob([fileBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPdfUrl(null);
    }
  }, [fileBuffer]);

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
    // Force re-render Document by providing array buffer
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
      // insert blank page after the specified index
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

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">PDF 预览与编辑</h1>
          <p className="mt-1 text-sm text-slate-500">直观查看并对单页进行删除、插入操作。</p>
        </div>
        {fileBuffer && (
          <div className="flex gap-3">
            <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="rounded-xl bg-white p-2 text-slate-600 shadow-sm"><Icon name="minimize" size={16} /></button>
            <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="rounded-xl bg-white p-2 text-slate-600 shadow-sm"><Icon name="plus" size={16} /></button>
            <button onClick={saveEditedPdf} className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-red-600/20">
              <Icon name="download" size={16} /> 保存文档
            </button>
          </div>
        )}
      </div>

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
          <>
            <div className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
              <div className="p-4 border-b border-slate-100 flex items-center gap-2 font-bold text-slate-800">
                <Icon name="search" size={16} /> 目录导航
              </div>
              <div className="flex-1 overflow-auto p-4 text-sm text-slate-600 custom-outline-container">
                <style>{`
                  .custom-outline-container ul { padding-left: 1.2rem; margin-top: 0.2rem; list-style-type: none; }
                  .custom-outline-container > .react-pdf__Outline > ul { padding-left: 0; }
                  .custom-outline-container li { padding: 4px 0; }
                  .custom-outline-container a { text-decoration: none; color: inherit; display: block; border-radius: 6px; padding: 2px 6px; transition: background 0.2s; }
                  .custom-outline-container a:hover { background-color: #f1f5f9; color: #e11d48; }
                `}</style>
                <Document file={pdfUrl}>
                  <Outline onItemClick={({ pageNumber }) => {
                    const el = document.getElementById(`page_${pageNumber}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }} />
                </Document>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-8 flex justify-center relative">
              {isProcessing && <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-sm flex items-center justify-center font-bold text-slate-600">处理中...</div>}
            <Document
              file={pdfUrl}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              loading={<div className="text-slate-500 font-bold">加载 PDF 中...</div>}
              className="flex flex-col gap-8"
            >
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
                      onClick={() => addBlankPage(index)} 
                      className="bg-white text-slate-700 p-2 rounded-xl shadow-lg ring-1 ring-slate-200 hover:bg-slate-50 hover:text-blue-600 tooltip"
                      title="在此页后插入空白页"
                    >
                      <Icon name="file" size={18} />
                    </button>
                    <button 
                      onClick={() => deletePage(index)} 
                      className="bg-white text-slate-700 p-2 rounded-xl shadow-lg ring-1 ring-slate-200 hover:bg-red-50 hover:text-red-600 tooltip"
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
            </Document>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
