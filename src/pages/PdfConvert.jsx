import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Icon from "../components/Icon";
import { addTask } from "../lib/taskStore";

export default function PdfConvert() {
  const location = useLocation();
  const [file, setFile] = useState(null);
  const [filePath, setFilePath] = useState(location.state?.externalFilePath || "");
  const [urlInput, setUrlInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState("pdf2docx"); // "pdf2docx", "office2pdf", "pdf2txt", "url2pdf"

  const handleFileInput = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFilePath(selectedFile.path || selectedFile.name);
    }
  };

  const handleSelectFiles = async () => {
    if (window.electronAPI) {
      let filters = [];
      if (mode === "pdf2docx" || mode === "pdf2txt") {
        filters = [{ name: "PDF Files", extensions: ["pdf"] }];
      } else if (mode === "office2pdf") {
        filters = [{ name: "Office Documents", extensions: ["doc", "docx", "xls", "xlsx", "ppt", "pptx"] }];
      }
        
      const result = await window.electronAPI.showOpenDialog({
        properties: ["openFile"],
        filters: filters,
      });
      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        setFilePath(result.filePaths[0]);
        const name = result.filePaths[0].split('\\').pop().split('/').pop();
        setFile({ name: name, size: 0 }); 
      }
    }
  };

  const executeConversion = async () => {
    if (mode === "url2pdf" && !urlInput.trim()) return alert("请输入有效的网址！");
    if (mode !== "url2pdf" && !filePath) return alert("请先选择要转换的文件！");
    
    setIsProcessing(true);
    
    try {
      if (window.electronAPI) {
        let defaultExt = "pdf";
        let defaultName = "转换结果.pdf";
        let filters = [{ name: "Document", extensions: ["pdf"] }];

        if (mode === "pdf2docx") {
          defaultExt = "docx";
          defaultName = file ? file.name.replace(/\.[^/.]+$/, "") + ".docx" : "转换结果.docx";
          filters = [{ name: "Word Document", extensions: ["docx"] }];
        } else if (mode === "pdf2txt") {
          defaultExt = "txt";
          defaultName = file ? file.name.replace(/\.[^/.]+$/, "") + ".txt" : "转换结果.txt";
          filters = [{ name: "Text File", extensions: ["txt"] }];
        } else if (mode === "office2pdf") {
          defaultName = file ? file.name.replace(/\.[^/.]+$/, "") + ".pdf" : "转换结果.pdf";
        } else if (mode === "url2pdf") {
          defaultName = "网页长截图.pdf";
        }
        
        const { canceled, filePath: savePath } = await window.electronAPI.showSaveDialog({
          title: "保存转换后的文件",
          defaultPath: defaultName,
          filters: filters
        });
        
        if (!canceled && savePath) {
          const input = mode === "url2pdf" ? urlInput.trim() : filePath;
          const res = await window.electronAPI.convertDocument(mode, input, savePath);
          if (res.status === "success") {
            alert("转换成功！文件已保存。");
            addTask({ file: defaultName, action: mode === "url2pdf" ? "网页转 PDF" : "格式转换", size: file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "-", progress: 100, status: "已完成" });
            setFile(null);
            setFilePath("");
            setUrlInput("");
          } else {
            alert("转换失败：" + res.message);
          }
        }
      } else {
        alert("此功能需要 Electron 桌面端环境运行转换引擎。");
      }
    } catch (err) {
      console.error(err);
      alert("转换过程中发生未知错误。");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-full flex-col p-6 overflow-auto">
      <div className="mb-6 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900">全能格式转换</h1>
          <p className="mt-1 text-sm text-slate-500">基于 Python 原生环境与 Electron 的全格式矩阵转换，极速且无损。</p>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-[500px]">
        <div className="flex-1 flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm overflow-auto">
          <div className="mb-6">
            <h3 className="font-bold text-slate-900 text-lg mb-4">选择转换模式</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <button onClick={() => { setMode("pdf2docx"); setFile(null); setFilePath(""); }} className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition ${mode === "pdf2docx" ? "border-red-600 bg-red-50 text-red-600" : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"}`}>
                <Icon name="file" size={24} className="mb-2" />
                <span className="font-bold text-sm">PDF 转 Word</span>
                <span className="text-[10px] mt-1 opacity-70">精准提取表格段落</span>
              </button>
              <button onClick={() => { setMode("office2pdf"); setFile(null); setFilePath(""); }} className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition ${mode === "office2pdf" ? "border-red-600 bg-red-50 text-red-600" : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"}`}>
                <Icon name="grid" size={24} className="mb-2" />
                <span className="font-bold text-sm">Office 转 PDF</span>
                <span className="text-[10px] mt-1 opacity-70">支持 Word/Excel/PPT</span>
              </button>
              <button onClick={() => { setMode("pdf2txt"); setFile(null); setFilePath(""); }} className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition ${mode === "pdf2txt" ? "border-red-600 bg-red-50 text-red-600" : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"}`}>
                <Icon name="signature" size={24} className="mb-2" />
                <span className="font-bold text-sm">PDF 转 TXT</span>
                <span className="text-[10px] mt-1 opacity-70">极速提取纯文本</span>
              </button>
              <button onClick={() => { setMode("url2pdf"); setFile(null); setFilePath(""); }} className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition ${mode === "url2pdf" ? "border-red-600 bg-red-50 text-red-600" : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"}`}>
                <Icon name="image" size={24} className="mb-2" />
                <span className="font-bold text-sm">网页 转 PDF</span>
                <span className="text-[10px] mt-1 opacity-70">保存离线长文排版</span>
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/50 p-6 items-center justify-center text-center transition hover:border-red-400">
            {mode === "url2pdf" ? (
              <div className="w-full max-w-md">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-slate-400 mb-6 mx-auto shadow-sm">
                  <Icon name="search" size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-4">输入要抓取的网页链接</h3>
                <input 
                  type="url" 
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com" 
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
            ) : !file ? (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-slate-400 mb-4 shadow-sm">
                  <Icon name="upload" size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  选择要转换的 {mode === "pdf2docx" || mode === "pdf2txt" ? "PDF" : "Office"} 文件
                </h3>
                <button 
                  onClick={handleSelectFiles}
                  className="mt-6 rounded-2xl bg-slate-900 px-6 py-3 font-bold text-white shadow-lg transition hover:bg-slate-800"
                >
                  浏览本地文件
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-50 text-red-600 mb-4">
                  <Icon name="file" size={40} />
                </div>
                <div className="font-bold text-slate-900 text-lg">{file.name}</div>
                <div className="text-sm text-slate-500 mt-1 max-w-sm truncate" title={filePath}>{filePath}</div>
                
                <button 
                  onClick={() => { setFile(null); setFilePath(""); }}
                  className="mt-4 text-sm font-bold text-slate-400 hover:text-red-600"
                >
                  移除并重新选择
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="w-[300px] shrink-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-900 text-lg">执行转换</h3>
          <div className="mt-6 flex-1 text-sm text-slate-600 space-y-4">
            <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100">
              <div className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                <Icon name="zap" size={16} /> 引擎状态
              </div>
              <p className="text-orange-700 text-xs leading-5">
                格式处理引擎已就绪。<br/><br/>
                Office 转 PDF：将调用系统原生接口，支持 Excel表格、PPT幻灯片等。<br/>
                网页转 PDF：无需打开浏览器，直接本地抓取！
              </p>
            </div>
            {isProcessing && (
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex flex-col items-center text-center">
                <div className="animate-spin mb-3 text-blue-600">
                  <Icon name="settings" size={24} />
                </div>
                <div className="font-bold text-blue-800">正在疯狂解析中...</div>
                <div className="text-xs text-blue-600 mt-1">请勿关闭软件，根据文件复杂度可能需要几秒到几十秒。</div>
              </div>
            )}
          </div>
          <button 
            onClick={executeConversion} 
            disabled={(mode !== "url2pdf" && !filePath) || (mode === "url2pdf" && !urlInput) || isProcessing}
            className={`mt-auto w-full rounded-2xl px-4 py-4 font-bold text-white shadow-lg transition ${(mode !== "url2pdf" && !filePath) || (mode === "url2pdf" && !urlInput) || isProcessing ? "bg-slate-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 hover:shadow-red-600/20"}`}
          >
            {isProcessing ? "转换中..." : "开始转换"}
          </button>
        </div>
      </div>
    </div>
  );
}
