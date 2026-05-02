import React, { useState } from "react";
import Icon from "../components/Icon";
import { addTask } from "../lib/taskStore";
import { MembershipGuard } from "../lib/featureGate";

const FORMATS = [
  { key: "image/png", label: "PNG", ext: "png", desc: "无损压缩，支持透明" },
  { key: "image/jpeg", label: "JPG", ext: "jpg", desc: "有损压缩，体积小" },
  { key: "image/webp", label: "WebP", ext: "webp", desc: "新一代格式，更小体积" },
];

function readAsImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function convertImage(img, format, quality) {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (format === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0);
  return new Promise((r) => canvas.toBlob(r, format, quality));
}

export default function ImageConvert() {
  const [files, setFiles] = useState([]);
  const [targetFormat, setTargetFormat] = useState("image/png");
  const [quality, setQuality] = useState(0.92);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSelectFiles = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.showOpenDialog({
        properties: ["openFile", "multiSelections"],
        filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "bmp", "gif"] }],
      });
      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        const loaded = result.filePaths.map(p => ({
          name: p.split('\\').pop().split('/').pop(),
          path: p,
          status: "pending",
          preview: null,
        }));
        setFiles(prev => [...prev, ...loaded]);
      }
    }
  };

  const handleFileDrop = async (e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    if (dropped.length > 0) {
      const loaded = dropped.map(f => ({
        name: f.name,
        path: f.path || "",
        file: f,
        status: "pending",
        preview: null,
      }));
      setFiles(prev => [...prev, ...loaded]);
    }
  };

  const removeFile = (index) => setFiles(files.filter((_, i) => i !== index));

  const executeConvert = async () => {
    if (files.length === 0) return alert("请先选择图片文件！");
    setIsProcessing(true);
    const results = [...files];
    let successCount = 0;
    const fmt = FORMATS.find(f => f.key === targetFormat);
    const ext = fmt?.ext || "png";

    let outputDir = null;
    if (window.electronAPI) {
      const { canceled, filePaths } = await window.electronAPI.showOpenDialog({
        title: "选择输出目录",
        properties: ["openDirectory"],
      });
      if (canceled || !filePaths || !filePaths[0]) { setIsProcessing(false); return; }
      outputDir = filePaths[0];
    }

    for (let i = 0; i < files.length; i++) {
      results[i] = { ...results[i], status: "processing" };
      setFiles([...results]);
      try {
        let buffer;
        if (window.electronAPI && files[i].path) {
          buffer = await window.electronAPI.readFile(files[i].path);
        } else if (files[i].file) {
          buffer = await files[i].file.arrayBuffer();
        }
        const blob = new Blob([buffer]);
        const img = await readAsImage(blob);
        const outBlob = await convertImage(img, targetFormat, quality);
        const outBytes = new Uint8Array(await outBlob.arrayBuffer());
        const baseName = files[i].name.replace(/\.[^/.]+$/, "");
        const sep = outputDir.includes('/') ? '/' : '\\';
        const savePath = outputDir + sep + baseName + "." + ext;
        const res = await window.electronAPI.saveFile(savePath, outBytes);
        results[i].status = res.success ? "done" : "error";
        if (res.success) successCount++;
      } catch (err) {
        console.error(err);
        results[i].status = "error";
      }
      setFiles([...results]);
    }

    setIsProcessing(false);
    addTask({ file: `${files.length} 个文件`, action: `转换为 ${fmt?.label}`, size: `${successCount}/${files.length} 成功`, progress: 100, status: "已完成" });
    alert(`转换完成！成功 ${successCount} 个，失败 ${files.length - successCount} 个。`);
  };

  return (
    <MembershipGuard>
    <div className="flex h-full flex-col p-6 overflow-auto">
      <div className="mb-6 shrink-0">
        <h1 className="text-2xl font-black text-slate-900">图片格式转换</h1>
        <p className="mt-1 text-sm text-slate-500">PNG / JPG / WebP 互转，支持批量。</p>
      </div>

      <div className="flex flex-1 gap-6 min-h-[400px]">
        <div className="flex-1 flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-slate-700">已选择 {files.length} 个文件</span>
            <button onClick={handleSelectFiles} className="text-sm font-bold text-red-600 hover:text-red-700">+ 添加文件</button>
          </div>
          <div
            className="flex-1 overflow-auto space-y-2"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
          >
            {files.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Icon name="image" size={32} />
                <p className="mt-3 text-sm">拖拽图片到此处或点击"添加文件"</p>
              </div>
            ) : files.map((f, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <Icon name="image" size={18} />
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
          <h3 className="font-bold text-slate-900 text-lg">转换设置</h3>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">目标格式</label>
              <div className="space-y-2">
                {FORMATS.map(f => (
                  <button key={f.key} onClick={() => setTargetFormat(f.key)} className={`w-full flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold border transition ${targetFormat === f.key ? "bg-red-50 text-red-600 border-red-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                    <span>{f.label}</span>
                    <span className="text-xs font-normal">{f.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            {targetFormat !== "image/png" && (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">质量: {Math.round(quality * 100)}%</label>
                <input type="range" min="0.1" max="1" step="0.05" value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="w-full accent-red-600" />
              </div>
            )}
          </div>
          <div className="mt-4 flex-1 text-xs text-slate-500 space-y-2">
            <p>PNG 转 JPG 会自动填充白色背景。</p>
            <p>支持 PNG、JPG、WebP、BMP、GIF 输入。</p>
          </div>
          <button
            onClick={executeConvert}
            disabled={files.length === 0 || isProcessing}
            className={`mt-auto w-full rounded-2xl px-4 py-4 font-bold text-white shadow-lg transition ${files.length === 0 || isProcessing ? "bg-slate-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 hover:shadow-red-600/20"}`}
          >
            {isProcessing ? "转换中..." : `转换 (${files.length})`}
          </button>
        </div>
      </div>
    </div>
    </MembershipGuard>
  );
}
