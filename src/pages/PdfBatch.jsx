import React, { useState } from "react";
import Icon from "../components/Icon";
import { rotatePdf, addWatermark } from "../lib/pdfCore";
import { addTask } from "../lib/taskStore";
import { MembershipGuard } from "../lib/featureGate";

const BATCH_MODES = [
  { key: "compress", label: "批量压缩", icon: "zap", desc: "统一压缩多个 PDF 文件" },
  { key: "encrypt", label: "批量加密", icon: "lock", desc: "为多个 PDF 统一添加密码" },
  { key: "watermark", label: "批量水印", icon: "shield", desc: "为多个 PDF 统一添加水印" },
  { key: "rotate", label: "批量旋转", icon: "settings", desc: "统一旋转多个 PDF 页面" },
];

export default function PdfBatch() {
  const [files, setFiles] = useState([]);
  const [mode, setMode] = useState("compress");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Watermark options
  const [wmText, setWmText] = useState("机密文件");
  const [wmOpacity, setWmOpacity] = useState(0.3);

  // Encrypt options
  const [password, setPassword] = useState("");

  // Rotate options
  const [rotateAngle, setRotateAngle] = useState(90);

  const handleSelectFiles = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.showOpenDialog({
        properties: ["openFile", "multiSelections"],
        filters: [{ name: "PDF Files", extensions: ["pdf"] }],
      });
      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        const loaded = result.filePaths.map(p => ({
          name: p.split('\\').pop().split('/').pop(),
          path: p,
          status: "pending",
        }));
        setFiles(prev => [...prev, ...loaded]);
      }
    }
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const executeBatch = async () => {
    if (files.length === 0) return alert("请先选择 PDF 文件！");
    if (mode === "encrypt" && !password.trim()) return alert("请输入密码！");
    if (mode === "watermark" && !wmText.trim()) return alert("请输入水印文字！");

    setIsProcessing(true);
    setProgress({ current: 0, total: files.length });

    const results = [...files];
    let successCount = 0;

    // Ask for output directory once
    let outputDir = null;
    if (window.electronAPI) {
      const { canceled, filePaths } = await window.electronAPI.showOpenDialog({
        title: "选择输出目录",
        properties: ["openDirectory"],
      });
      if (canceled || !filePaths || !filePaths[0]) {
        setIsProcessing(false);
        return;
      }
      outputDir = filePaths[0];
    }

    for (let i = 0; i < files.length; i++) {
      setProgress({ current: i + 1, total: files.length });
      results[i] = { ...results[i], status: "processing" };
      setFiles([...results]);

      try {
        const buffer = await window.electronAPI.readFile(files[i].path);
        let resultBytes;

        if (mode === "compress") {
          const { PDFDocument } = await import("pdf-lib");
          const pdf = await PDFDocument.load(buffer);
          resultBytes = await pdf.save({ useObjectStreams: true });
        } else if (mode === "encrypt") {
          // Encrypt via Python backend
          const baseName = files[i].name.replace(/\.[^/.]+$/, "");
          const savePath = outputDir + (outputDir.includes('/') ? '/' : '\\') + baseName + "_已加密.pdf";
          const res = await window.electronAPI.convertDocument("encrypt", files[i].path, savePath, password);
          results[i].status = res.status === "success" ? "done" : "error";
          if (res.status === "success") successCount++;
          setFiles([...results]);
          continue;
        } else if (mode === "watermark") {
          resultBytes = await addWatermark(buffer, { text: wmText, opacity: wmOpacity });
        } else if (mode === "rotate") {
          resultBytes = await rotatePdf(buffer, rotateAngle);
        }

        if (resultBytes) {
          const baseName = files[i].name.replace(/\.[^/.]+$/, "");
          const suffix = mode === "compress" ? "_已压缩" : mode === "watermark" ? "_已加水印" : "_已旋转";
          const savePath = outputDir + (outputDir.includes('/') ? '/' : '\\') + baseName + suffix + ".pdf";
          const res = await window.electronAPI.saveFile(savePath, resultBytes);
          results[i].status = res.success ? "done" : "error";
          if (res.success) successCount++;
        }
      } catch (err) {
        console.error(err);
        results[i].status = "error";
      }
      setFiles([...results]);
    }

    setIsProcessing(false);
    addTask({ file: `${files.length} 个文件`, action: `批量${BATCH_MODES.find(m => m.key === mode)?.label || mode}`, size: `${successCount}/${files.length} 成功`, progress: 100, status: "已完成" });
    alert(`批量处理完成！成功 ${successCount} 个，失败 ${files.length - successCount} 个。`);
  };

  return (
    <MembershipGuard>
    <div className="flex h-full flex-col p-6 overflow-auto">
      <div className="mb-6 shrink-0">
        <h1 className="text-2xl font-black text-slate-900">批量处理</h1>
        <p className="mt-1 text-sm text-slate-500">选多个 PDF 文件，统一执行同一操作。</p>
      </div>

      <div className="flex flex-1 gap-6 min-h-[400px]">
        <div className="flex-1 flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm overflow-auto">
          {/* Mode selection */}
          <div className="mb-5">
            <label className="block text-xs font-bold text-slate-500 mb-2">选择操作</label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {BATCH_MODES.map(m => (
                <button key={m.key} onClick={() => setMode(m.key)} className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition ${mode === m.key ? "border-red-600 bg-red-50 text-red-600" : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"}`}>
                  <Icon name={m.icon} size={24} />
                  <span className="text-xs font-bold">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mode-specific options */}
          {mode === "encrypt" && (
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-500 mb-2">密码</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="输入加密密码" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-red-500" />
            </div>
          )}
          {mode === "watermark" && (
            <div className="mb-5 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">水印文字</label>
                <input type="text" value={wmText} onChange={(e) => setWmText(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-red-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">透明度: {Math.round(wmOpacity * 100)}%</label>
                <input type="range" min="0.05" max="1" step="0.05" value={wmOpacity} onChange={(e) => setWmOpacity(Number(e.target.value))} className="w-full accent-red-600 mt-3" />
              </div>
            </div>
          )}
          {mode === "rotate" && (
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-500 mb-2">旋转角度</label>
              <div className="flex gap-2">
                {[90, 180, 270].map(a => (
                  <button key={a} onClick={() => setRotateAngle(a)} className={`rounded-xl px-4 py-2 text-sm font-bold border transition ${rotateAngle === a ? "bg-red-50 text-red-600 border-red-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                    {a}°
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* File list */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-slate-700">已选择 {files.length} 个文件</span>
            <button onClick={handleSelectFiles} className="text-sm font-bold text-red-600 hover:text-red-700">+ 添加文件</button>
          </div>
          <div className="flex-1 overflow-auto space-y-2">
            {files.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Icon name="upload" size={32} />
                <p className="mt-3 text-sm">点击上方"添加文件"选择 PDF</p>
              </div>
            ) : files.map((f, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <Icon name="file" size={18} />
                  <span className="truncate text-sm font-medium text-slate-700">{f.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {f.status === "done" && <span className="text-xs font-bold text-green-600">完成</span>}
                  {f.status === "error" && <span className="text-xs font-bold text-red-600">失败</span>}
                  {f.status === "processing" && <span className="text-xs font-bold text-orange-500">处理中...</span>}
                  {f.status === "pending" && (
                    <button onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-600">
                      <Icon name="close" size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-[280px] shrink-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-900 text-lg">{BATCH_MODES.find(m => m.key === mode)?.label}</h3>
          <p className="mt-2 text-sm text-slate-500">{BATCH_MODES.find(m => m.key === mode)?.desc}</p>

          {isProcessing && (
            <div className="mt-4 p-4 rounded-2xl bg-blue-50 border border-blue-100">
              <div className="text-sm font-bold text-blue-800 mb-2">处理进度</div>
              <div className="h-2 rounded-full bg-blue-100 overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
              </div>
              <div className="mt-1 text-xs text-blue-600">{progress.current} / {progress.total}</div>
            </div>
          )}

          <div className="mt-4 flex-1 text-xs text-slate-500 space-y-2">
            <p>所有文件将统一输出到同一目录。</p>
            <p>文件名自动添加后缀标识。</p>
          </div>
          <button
            onClick={executeBatch}
            disabled={files.length === 0 || isProcessing}
            className={`mt-auto w-full rounded-2xl px-4 py-4 font-bold text-white shadow-lg transition ${files.length === 0 || isProcessing ? "bg-slate-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 hover:shadow-red-600/20"}`}
          >
            {isProcessing ? "处理中..." : `批量处理 (${files.length})`}
          </button>
        </div>
      </div>
    </div>
    </MembershipGuard>
  );
}
