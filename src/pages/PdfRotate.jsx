import React, { useState } from "react";
import Icon from "../components/Icon";
import { rotatePdf } from "../lib/pdfCore";
import { addTask } from "../lib/taskStore";

export default function PdfRotate() {
  const [file, setFile] = useState(null);
  const [filePath, setFilePath] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [angle, setAngle] = useState(90);
  const [scope, setScope] = useState("all"); // "all" | "odd" | "even"

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

  const executeRotate = async () => {
    if (!file) return alert("请先选择 PDF 文件！");
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

      const srcPdf = await (await import("pdf-lib")).PDFDocument.load(buffer);
      const totalPages = srcPdf.getPageCount();
      let indices = null;
      if (scope === "odd") {
        indices = Array.from({ length: totalPages }, (_, i) => i).filter(i => i % 2 === 0);
      } else if (scope === "even") {
        indices = Array.from({ length: totalPages }, (_, i) => i).filter(i => i % 2 === 1);
      }

      const result = await rotatePdf(buffer, angle, indices);

      if (window.electronAPI) {
        const defaultName = file.name.replace(/\.[^/.]+$/, "") + "_已旋转.pdf";
        const { canceled, filePath: savePath } = await window.electronAPI.showSaveDialog({
          title: "保存旋转后的 PDF",
          defaultPath: defaultName,
          filters: [{ name: "PDF Files", extensions: ["pdf"] }],
        });
        if (!canceled && savePath) {
          const res = await window.electronAPI.saveFile(savePath, result);
          if (res.success) {
            addTask({ file: file.name, action: `旋转 ${angle}°`, size: `${totalPages} 页`, progress: 100, status: "已完成" });
            alert("旋转成功！");
            setFile(null); setFilePath("");
          } else {
            alert("保存失败：" + res.error);
          }
        }
      }
    } catch (err) {
      console.error(err);
      alert("旋转失败，请检查文件是否损坏。");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-full flex-col p-6 overflow-auto">
      <div className="mb-6 shrink-0">
        <h1 className="text-2xl font-black text-slate-900">PDF 旋转</h1>
        <p className="mt-1 text-sm text-slate-500">旋转 PDF 页面方向，支持指定范围。</p>
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
                <Icon name="settings" size={40} />
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

              {/* Rotation preview */}
              <div className="mt-8 flex items-center gap-6">
                <div className="flex h-32 w-24 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white text-slate-400 transition" style={{ transform: `rotate(${angle}deg)` }}>
                  <Icon name="file" size={32} />
                </div>
                <div className="text-4xl font-black text-red-600">{angle}°</div>
              </div>
            </div>
          )}
        </div>

        <div className="w-[300px] shrink-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-900 text-lg">旋转设置</h3>
          <div className="mt-6 flex-1 space-y-5 text-sm text-slate-600">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">旋转角度</label>
              <div className="grid grid-cols-3 gap-2">
                {[90, 180, 270].map(a => (
                  <button key={a} onClick={() => setAngle(a)} className={`rounded-xl px-3 py-3 text-sm font-bold border transition ${angle === a ? "bg-red-50 text-red-600 border-red-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                    {a}°
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">旋转范围</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "all", label: "全部页" },
                  { key: "odd", label: "奇数页" },
                  { key: "even", label: "偶数页" },
                ].map(s => (
                  <button key={s.key} onClick={() => setScope(s.key)} className={`rounded-xl px-3 py-3 text-sm font-bold border transition ${scope === s.key ? "bg-red-50 text-red-600 border-red-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
              <p className="text-blue-700 text-xs leading-5">
                旋转操作会修改 PDF 内的页面方向，适用于扫描件方向不对的情况。全程本地处理。
              </p>
            </div>
          </div>
          <button
            onClick={executeRotate}
            disabled={!file || isProcessing}
            className={`mt-auto w-full rounded-2xl px-4 py-4 font-bold text-white shadow-lg transition ${!file || isProcessing ? "bg-slate-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 hover:shadow-red-600/20"}`}
          >
            {isProcessing ? "处理中..." : "执行旋转"}
          </button>
        </div>
      </div>
    </div>
  );
}
