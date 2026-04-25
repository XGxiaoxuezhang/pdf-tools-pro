import React, { useState } from "react";
import Icon from "../components/Icon";
import { mergePdfs } from "../lib/pdfCore";

export default function PdfMerge() {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSelectFiles = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.showOpenDialog({
        properties: ["openFile", "multiSelections"],
        filters: [{ name: "PDF Files", extensions: ["pdf"] }],
      });
      if (!result.canceled && result.filePaths) {
        // Read files using HTML5 File API or Node.js.
        // We can't read files directly with File API via paths, so we fetch them as array buffer.
        // In a real Electron app we can load local files via `file://` protocol or IPC.
        // But the easiest way is to let the user use the file input.
      }
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type === "application/pdf" || f.name.endsWith(".pdf"));
    setFiles(prev => [...prev, ...droppedFiles]);
  };

  const handleFileInput = (e) => {
    const selectedFiles = Array.from(e.target.files).filter(f => f.type === "application/pdf" || f.name.endsWith(".pdf"));
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const executeMerge = async () => {
    if (files.length < 2) return alert("请至少选择两个 PDF 文件！");
    setIsProcessing(true);
    try {
      const buffers = await Promise.all(files.map(f => f.arrayBuffer()));
      const mergedBytes = await mergePdfs(buffers);
      
      if (window.electronAPI) {
        const { canceled, filePath } = await window.electronAPI.showSaveDialog({
          title: "保存合并后的 PDF",
          defaultPath: "合并文档.pdf",
          filters: [{ name: "PDF Files", extensions: ["pdf"] }]
        });
        if (!canceled && filePath) {
          const res = await window.electronAPI.saveFile(filePath, mergedBytes);
          if (res.success) {
            alert("合并成功并已保存！");
            setFiles([]);
          } else {
            alert("保存失败：" + res.error);
          }
        }
      } else {
        // Fallback for web
        const blob = new Blob([mergedBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "合并文档.pdf";
        a.click();
        URL.revokeObjectURL(url);
        setFiles([]);
      }
    } catch (err) {
      console.error(err);
      alert("合并失败，请检查文件是否损坏或已加密。");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">PDF 合并</h1>
          <p className="mt-1 text-sm text-slate-500">将多个 PDF 文件合并为一个文件，支持拖拽排序。</p>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        <div 
          className="flex-1 flex flex-col rounded-3xl border-2 border-dashed border-slate-300 bg-white/50 p-6 transition hover:border-red-400 hover:bg-red-50/50"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
        >
          {files.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
                <Icon name="upload" size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">拖拽 PDF 文件到此处</h3>
              <p className="mt-2 text-slate-500">或点击下方按钮选择文件</p>
              <label className="mt-6 cursor-pointer rounded-2xl bg-slate-900 px-6 py-3 font-bold text-white shadow-lg transition hover:bg-slate-800">
                选择文件
                <input type="file" multiple accept=".pdf" className="hidden" onChange={handleFileInput} />
              </label>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-slate-700">已选择 {files.length} 个文件</span>
                <label className="cursor-pointer text-sm font-bold text-red-600 hover:text-red-700">
                  + 继续添加
                  <input type="file" multiple accept=".pdf" className="hidden" onChange={handleFileInput} />
                </label>
              </div>
              <div className="flex-1 overflow-auto space-y-3 pr-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                        <Icon name="file" size={20} />
                      </div>
                      <div className="truncate">
                        <div className="truncate font-bold text-slate-900">{f.name}</div>
                        <div className="text-xs text-slate-500">{(f.size / 1024 / 1024).toFixed(2)} MB</div>
                      </div>
                    </div>
                    <button onClick={() => removeFile(i)} className="p-2 text-slate-400 hover:text-red-600">
                      <Icon name="trash" size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-[300px] shrink-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-900 text-lg">合并设置</h3>
          <div className="mt-6 flex-1 text-sm text-slate-600">
            <p className="mb-2">⚠️ 提示：</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>目前文件合并顺序将按照上方列表从上到下的顺序进行。</li>
              <li>如果文件有加密，合并可能会失败。</li>
              <li>合并过程全程在本地完成，保护您的隐私。</li>
            </ul>
          </div>
          <button 
            onClick={executeMerge} 
            disabled={files.length < 2 || isProcessing}
            className={`mt-auto w-full rounded-2xl px-4 py-4 font-bold text-white shadow-lg transition ${files.length < 2 || isProcessing ? "bg-slate-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 hover:shadow-red-600/20"}`}
          >
            {isProcessing ? "处理中..." : "执行合并"}
          </button>
        </div>
      </div>
    </div>
  );
}
