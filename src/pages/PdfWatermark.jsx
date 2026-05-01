import React, { useState } from "react";
import Icon from "../components/Icon";
import { addWatermark } from "../lib/pdfCore";
import { addTask } from "../lib/taskStore";

export default function PdfWatermark() {
  const [file, setFile] = useState(null);
  const [filePath, setFilePath] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [text, setText] = useState("机密文件");
  const [fontSize, setFontSize] = useState(48);
  const [color, setColor] = useState("#999999");
  const [opacity, setOpacity] = useState(0.3);
  const [angle, setAngle] = useState(-45);

  const handleSelectFiles = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.showOpenDialog({
        properties: ["openFile"],
        filters: [{ name: "PDF Files", extensions: ["pdf"] }],
      });
      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        setFilePath(result.filePaths[0]);
        const name = result.filePaths[0].split('\\').pop().split('/').pop();
        setFile({ name, size: 0 });
      }
    }
  };

  const handleFileDrop = async (e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).find(f => f.type === "application/pdf" || f.name.endsWith(".pdf"));
    if (dropped) {
      setFile(dropped);
      setFilePath(dropped.path || "");
    }
  };

  const executeWatermark = async () => {
    if (!file) return alert("请先选择 PDF 文件！");
    if (!text.trim()) return alert("请输入水印文字！");
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

      const result = await addWatermark(buffer, { text, fontSize, color, opacity, angle });

      if (window.electronAPI) {
        const defaultName = file.name.replace(/\.[^/.]+$/, "") + "_已加水印.pdf";
        const { canceled, filePath: savePath } = await window.electronAPI.showSaveDialog({
          title: "保存加水印后的 PDF",
          defaultPath: defaultName,
          filters: [{ name: "PDF Files", extensions: ["pdf"] }],
        });
        if (!canceled && savePath) {
          const res = await window.electronAPI.saveFile(savePath, result);
          if (res.success) {
            addTask({ file: file.name, action: "添加水印", size: `"${text}"`, progress: 100, status: "已完成" });
            alert("水印添加成功！");
            setFile(null); setFilePath("");
          } else {
            alert("保存失败：" + res.error);
          }
        }
      }
    } catch (err) {
      console.error(err);
      alert("添加水印失败，请检查文件是否损坏。");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-full flex-col p-6 overflow-auto">
      <div className="mb-6 shrink-0">
        <h1 className="text-2xl font-black text-slate-900">PDF 水印</h1>
        <p className="mt-1 text-sm text-slate-500">为 PDF 添加文字水印，支持自定义样式。</p>
      </div>

      <div className="flex flex-1 gap-6 min-h-[400px]">
        <div
          className="flex-1 flex flex-col rounded-3xl border-2 border-dashed border-slate-300 bg-white/50 p-6 transition hover:border-red-400 hover:bg-red-50/50"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
        >
          {!file ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
                <Icon name="shield" size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">拖拽 PDF 文件到此处</h3>
              <p className="mt-2 text-slate-500">或点击下方按钮选择文件</p>
              <button onClick={handleSelectFiles} className="mt-6 rounded-2xl bg-slate-900 px-6 py-3 font-bold text-white shadow-lg transition hover:bg-slate-800">
                选择文件
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-50 text-red-600 mb-4">
                <Icon name="file" size={40} />
              </div>
              <div className="font-bold text-slate-900 text-lg">{file.name}</div>
              <button onClick={() => { setFile(null); setFilePath(""); }} className="mt-3 text-sm font-bold text-slate-400 hover:text-red-600">
                移除并重新选择
              </button>

              {/* Watermark preview */}
              <div className="mt-8 relative w-64 h-40 rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center" style={{ transform: `rotate(${angle}deg)`, opacity }}>
                  <span style={{ fontSize: Math.min(fontSize, 24), color, fontWeight: "bold", whiteSpace: "nowrap" }}>{text || "水印预览"}</span>
                </div>
                <span className="relative text-xs text-slate-400">预览效果</span>
              </div>
            </div>
          )}
        </div>

        <div className="w-[300px] shrink-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-900 text-lg">水印设置</h3>
          <div className="mt-6 flex-1 space-y-4 text-sm text-slate-600">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">水印文字</label>
              <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="输入水印文字" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">字号: {fontSize}</label>
              <input type="range" min="12" max="120" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-full accent-red-600" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">颜色</label>
              <div className="flex items-center gap-3">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer" />
                <span className="text-xs text-slate-400 font-mono">{color}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">透明度: {Math.round(opacity * 100)}%</label>
              <input type="range" min="0.05" max="1" step="0.05" value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="w-full accent-red-600" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">角度: {angle}°</label>
              <input type="range" min="-90" max="90" value={angle} onChange={(e) => setAngle(Number(e.target.value))} className="w-full accent-red-600" />
            </div>
          </div>
          <button
            onClick={executeWatermark}
            disabled={!file || !text.trim() || isProcessing}
            className={`mt-auto w-full rounded-2xl px-4 py-4 font-bold text-white shadow-lg transition ${!file || !text.trim() || isProcessing ? "bg-slate-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 hover:shadow-red-600/20"}`}
          >
            {isProcessing ? "处理中..." : "添加水印"}
          </button>
        </div>
      </div>
    </div>
  );
}
