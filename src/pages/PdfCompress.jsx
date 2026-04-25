import React, { useState } from "react";
import Icon from "../components/Icon";
import { addTask } from "../lib/taskStore";

export default function PdfCompress() {
  const [file, setFile] = useState(null);
  const [filePath, setFilePath] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSelectFiles = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.showOpenDialog({
        properties: ["openFile"],
        filters: [{ name: "PDF Files", extensions: ["pdf"] }],
      });
      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        setFilePath(result.filePaths[0]);
        const name = result.filePaths[0].split('\\').pop().split('/').pop();
        setFile({ name: name, size: 0 }); 
      }
    }
  };

  const executeCompress = async () => {
    if (!filePath) return alert("请先选择要压缩的文件！");
    setIsProcessing(true);
    
    try {
      if (window.electronAPI) {
        const defaultName = file ? file.name.replace(/\.[^/.]+$/, "") + "_已压缩.pdf" : "压缩结果.pdf";
        
        const { canceled, filePath: savePath } = await window.electronAPI.showSaveDialog({
          title: "保存压缩后的文件",
          defaultPath: defaultName,
          filters: [{ name: "PDF Files", extensions: ["pdf"] }]
        });
        
        if (!canceled && savePath) {
          const res = await window.electronAPI.convertDocument("compress", filePath, savePath);
          if (res.status === "success") {
            alert("极速瘦身成功！文件已保存。");
            addTask({ file: file.name, action: "极限瘦身", size: `${(file.size / 1024 / 1024).toFixed(2)} MB -> 更小`, progress: 100, status: "已完成" });
            setFile(null);
            setFilePath("");
          } else {
            alert("压缩失败：" + res.message);
          }
        }
      }
    } catch (err) {
      console.error(err);
      alert("压缩过程中发生错误。");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-full flex-col p-6 overflow-auto">
      <div className="mb-6 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900">PDF 智能瘦身</h1>
          <p className="mt-1 text-sm text-slate-500">清除无用对象与重新压缩数据流，显著减小文件体积。</p>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-[400px]">
        <div className="flex-1 flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm overflow-auto">
          <div className="flex-1 flex flex-col border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/50 p-6 items-center justify-center text-center transition hover:border-red-400">
            {!file ? (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-slate-400 mb-4 shadow-sm">
                  <Icon name="zap" size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">选择要压缩的 PDF 文件</h3>
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
          <h3 className="font-bold text-slate-900 text-lg">压缩设置</h3>
          <div className="mt-6 flex-1 text-sm text-slate-600 space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="font-bold text-slate-800 mb-2">深度瘦身策略</div>
              <ul className="list-disc pl-4 space-y-2 text-slate-600 text-xs">
                <li>清除冗余重复的图片数据</li>
                <li>合并相同的字体流</li>
                <li>进行更高级别的 DEFLATE 压缩算法计算</li>
              </ul>
            </div>
            {isProcessing && (
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex flex-col items-center text-center">
                <div className="animate-spin mb-3 text-blue-600">
                  <Icon name="settings" size={24} />
                </div>
                <div className="font-bold text-blue-800">正在疯狂压缩中...</div>
              </div>
            )}
          </div>
          <button 
            onClick={executeCompress} 
            disabled={!filePath || isProcessing}
            className={`mt-auto w-full rounded-2xl px-4 py-4 font-bold text-white shadow-lg transition ${!filePath || isProcessing ? "bg-slate-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 hover:shadow-red-600/20"}`}
          >
            {isProcessing ? "压缩中..." : "开始极限压缩"}
          </button>
        </div>
      </div>
    </div>
  );
}
