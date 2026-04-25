import React, { useState } from "react";
import Icon from "../components/Icon";
import { PDFDocument } from "pdf-lib";
import { addTask } from "../lib/taskStore";

export default function PdfSplit() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [splitMode, setSplitMode] = useState("fixed"); // fixed, extract
  const [fixedPages, setFixedPages] = useState(1);
  const [pageRanges, setPageRanges] = useState("");

  const handleFileInput = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && (selectedFile.type === "application/pdf" || selectedFile.name.endsWith(".pdf"))) {
      setFile(selectedFile);
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const selectedFile = Array.from(e.dataTransfer.files).find(f => f.type === "application/pdf" || f.name.endsWith(".pdf"));
    if (selectedFile) setFile(selectedFile);
  };

  const removeFile = () => setFile(null);

  const parseRanges = (rangeStr, maxPage) => {
    const pages = new Set();
    const parts = rangeStr.split(/[,，]/);
    for (let part of parts) {
      part = part.trim();
      if (!part) continue;
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(n => parseInt(n));
        if (start && end && start <= end) {
          for (let i = start; i <= end; i++) {
            if (i >= 1 && i <= maxPage) pages.add(i - 1);
          }
        }
      } else {
        const num = parseInt(part);
        if (num >= 1 && num <= maxPage) pages.add(num - 1);
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  };

  const executeSplit = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const buffer = await file.arrayBuffer();
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
        const indices = parseRanges(pageRanges, totalPages);
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
              const savePath = `${dir}\\${fileName}`;
              await window.electronAPI.saveFile(savePath, splitDocs[j]);
            }
            alert(`成功！已拆分为 ${splitDocs.length} 个文件并保存到 ${dir}`);
            addTask({ file: file.name, action: "批量拆分", size: `${(file.size / 1024 / 1024).toFixed(2)} MB`, progress: 100, status: "已完成" });
            setFile(null);
          }
        } else if (splitMode === "extract") {
          const defaultName = file.name.replace(/\.[^/.]+$/, "") + "_提取.pdf";
          const { canceled, filePath: savePath } = await window.electronAPI.showSaveDialog({
            title: "保存提取后的文件",
            defaultPath: defaultName,
            filters: [{ name: "PDF Files", extensions: ["pdf"] }]
          });
          if (!canceled && savePath) {
            await window.electronAPI.saveFile(savePath, splitDocs[0]);
            alert("成功！提取的文件已保存。");
            addTask({ file: file.name, action: "提取页面", size: "-", progress: 100, status: "已完成" });
            setFile(null);
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
    <div className="flex h-full flex-col p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">PDF 拆分与提取</h1>
          <p className="mt-1 text-sm text-slate-500">按固定页数拆分大型文档，或提取特定页码组合成新文件。</p>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        <div 
          className="flex-1 flex flex-col rounded-3xl border-2 border-dashed border-slate-300 bg-white/50 p-6 transition hover:border-red-400 hover:bg-red-50/50"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
        >
          {!file ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
                <Icon name="scissors" size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">拖拽单份 PDF 文件到此处</h3>
              <p className="mt-2 text-slate-500">或点击下方按钮选择文件</p>
              <label className="mt-6 cursor-pointer rounded-2xl bg-slate-900 px-6 py-3 font-bold text-white shadow-lg transition hover:bg-slate-800">
                选择文件
                <input type="file" accept=".pdf" className="hidden" onChange={handleFileInput} />
              </label>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-slate-700">当前拆分文件</span>
              </div>
              <div className="flex-1 overflow-auto pr-2">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                      <Icon name="file" size={24} />
                    </div>
                    <div className="truncate">
                      <div className="truncate font-bold text-slate-900">{file.name}</div>
                      <div className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                  </div>
                  <button onClick={removeFile} className="p-2 text-slate-400 hover:text-red-600">
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="w-[300px] shrink-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-900 text-lg">拆分设置</h3>
          <div className="mt-6 flex-1 text-sm text-slate-600 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">拆分模式</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setSplitMode("fixed")}
                  className={`rounded-xl px-2 py-2 text-xs font-bold border transition ${splitMode === "fixed" ? "bg-red-50 text-red-600 border-red-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}
                >
                  固定拆分
                </button>
                <button 
                  onClick={() => setSplitMode("extract")}
                  className={`rounded-xl px-2 py-2 text-xs font-bold border transition ${splitMode === "extract" ? "bg-red-50 text-red-600 border-red-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}
                >
                  提取页面
                </button>
              </div>
            </div>
            
            {splitMode === "fixed" && (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">每 N 页拆分为一份文件</label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1">
                  <button onClick={() => setFixedPages(Math.max(1, fixedPages - 1))} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm font-bold text-slate-600 hover:text-red-600">-</button>
                  <input 
                    type="number" 
                    min="1" 
                    value={fixedPages} 
                    onChange={e => setFixedPages(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 bg-transparent text-center font-bold outline-none"
                  />
                  <button onClick={() => setFixedPages(fixedPages + 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm font-bold text-slate-600 hover:text-red-600">+</button>
                </div>
                <p className="mt-2 text-xs text-slate-400">将把原文档平均切分成多个等长的小文件，并保存至一个文件夹中。</p>
              </div>
            )}

            {splitMode === "extract" && (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">输入页码范围</label>
                <input 
                  type="text" 
                  value={pageRanges}
                  onChange={(e) => setPageRanges(e.target.value)}
                  placeholder="如: 1, 3, 5-10"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-slate-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
                <p className="mt-2 text-xs text-slate-400">将只提取您填写的页码，组合成一份全新的 PDF 文件输出。</p>
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
