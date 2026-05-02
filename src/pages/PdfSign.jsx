import React, { useState, useRef, useEffect } from "react";
import Icon from "../components/Icon";
import { addTask } from "../lib/taskStore";
import { PDFDocument } from "pdf-lib";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { MembershipGuard } from "../lib/featureGate";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

function SignaturePad({ onSave }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const start = (e) => {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const end = () => { drawing.current = false; };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const save = () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
  };

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        width={400}
        height={150}
        className="w-full rounded-xl border-2 border-dashed border-slate-300 bg-white cursor-crosshair touch-none"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <div className="flex gap-2">
        <button onClick={clear} className="flex-1 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 transition">清除</button>
        <button onClick={save} className="flex-1 rounded-xl bg-red-600 px-3 py-2 text-sm font-bold text-white hover:bg-red-700 transition">确认签名</button>
      </div>
    </div>
  );
}

const SIGN_POSITIONS = [
  { key: "bottom-right", label: "右下" },
  { key: "bottom-left", label: "左下" },
  { key: "center", label: "居中" },
  { key: "top-right", label: "右上" },
  { key: "top-left", label: "左上" },
];

function getSignStyle(position, signSize) {
  const size = Math.min(signSize, 80);
  const base = "absolute border-2 border-dashed border-red-400 bg-red-50/50 rounded-lg flex items-center justify-center";
  switch (position) {
    case "bottom-right": return { className: `${base} bottom-3 right-3`, style: { width: size, height: size * 0.5 } };
    case "bottom-left": return { className: `${base} bottom-3 left-3`, style: { width: size, height: size * 0.5 } };
    case "top-right": return { className: `${base} top-3 right-3`, style: { width: size, height: size * 0.5 } };
    case "top-left": return { className: `${base} top-3 left-3`, style: { width: size, height: size * 0.5 } };
    case "center": return { className: `${base} top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`, style: { width: size, height: size * 0.5 } };
    default: return { className: `${base} bottom-3 right-3`, style: { width: size, height: size * 0.5 } };
  }
}

export default function PdfSign() {
  const [file, setFile] = useState(null);
  const [filePath, setFilePath] = useState("");
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);
  const [signMode, setSignMode] = useState("draw");
  const [position, setPosition] = useState("bottom-right");
  const [signSize, setSignSize] = useState(150);
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const loadPdf = async (path) => {
    if (window.electronAPI && path) {
      const buffer = await window.electronAPI.readFile(path);
      const blob = new Blob([buffer], { type: "application/pdf" });
      setPdfUrl(URL.createObjectURL(blob));
    }
  };

  const handleSelectFiles = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.showOpenDialog({
        properties: ["openFile"],
        filters: [{ name: "PDF Files", extensions: ["pdf"] }],
      });
      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        const path = result.filePaths[0];
        const name = path.split('\\').pop().split('/').pop();
        setFilePath(path);
        setFile({ name, size: 0 });
        try {
          const buf = await window.electronAPI.readFile(path);
          const pdf = await PDFDocument.load(buf);
          setTotalPages(pdf.getPageCount());
        } catch { setTotalPages(0); }
        await loadPdf(path);
      }
    }
  };

  const handleFileDrop = async (e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).find(f => f.type === "application/pdf" || f.name.endsWith(".pdf"));
    if (dropped) {
      setFile(dropped);
      setFilePath(dropped.path || "");
      try {
        const buf = dropped.arrayBuffer ? await dropped.arrayBuffer() : null;
        if (buf) {
          const pdf = await PDFDocument.load(buf);
          setTotalPages(pdf.getPageCount());
        }
      } catch { setTotalPages(0); }
      if (dropped.path) await loadPdf(dropped.path);
    }
  };

  const handleImageUpload = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.showOpenDialog({
        properties: ["openFile"],
        filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg"] }],
      });
      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        const buf = await window.electronAPI.readFile(result.filePaths[0]);
        const blob = new Blob([buf], { type: "image/png" });
        const reader = new FileReader();
        reader.onload = () => setSignatureDataUrl(reader.result);
        reader.readAsDataURL(blob);
      }
    }
  };

  const executeSign = async () => {
    if (!file) return alert("请先选择 PDF 文件！");
    if (!signatureDataUrl) return alert("请先创建或上传签名！");
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

      const pdf = await PDFDocument.load(buffer);
      const pages = pdf.getPages();
      const targetIdx = Math.min(Math.max(pageNum - 1, 0), pages.length - 1);
      const page = pages[targetIdx];
      const { width, height } = page.getSize();

      const base64 = signatureDataUrl.split(",")[1];
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const sigImage = await pdf.embedPng(bytes);
      const aspect = sigImage.width / sigImage.height;
      const sigW = signSize;
      const sigH = signSize / aspect;

      const positions = {
        "bottom-right": { x: width - sigW - 50, y: 50 },
        "bottom-left": { x: 50, y: 50 },
        "top-right": { x: width - sigW - 50, y: height - sigH - 50 },
        "top-left": { x: 50, y: height - sigH - 50 },
        "center": { x: (width - sigW) / 2, y: (height - sigH) / 2 },
      };
      const pos = positions[position] || positions["bottom-right"];

      page.drawImage(sigImage, { x: pos.x, y: pos.y, width: sigW, height: sigH });

      const resultBytes = await pdf.save();
      const defaultName = file.name.replace(/\.[^/.]+$/, "") + "_已签名.pdf";
      const { canceled, filePath: savePath } = await window.electronAPI.showSaveDialog({
        title: "保存签名后的 PDF",
        defaultPath: defaultName,
        filters: [{ name: "PDF Files", extensions: ["pdf"] }],
      });
      if (!canceled && savePath) {
        const res = await window.electronAPI.saveFile(savePath, resultBytes);
        if (res.success) {
          addTask({ file: file.name, action: "添加签名", size: `第 ${pageNum} 页`, progress: 100, status: "已完成" });
          alert("签名添加成功！");
          setFile(null); setFilePath(""); setPdfUrl(null); setSignatureDataUrl(null);
        } else {
          alert("保存失败：" + res.error);
        }
      }
    } catch (err) {
      console.error(err);
      alert("签名失败，请检查文件是否损坏。");
    } finally {
      setIsProcessing(false);
    }
  };

  const signPosStyle = getSignStyle(position, signSize);

  return (
    <MembershipGuard>
    <div className="flex h-full flex-col p-6 overflow-auto">
      <div className="mb-6 shrink-0">
        <h1 className="text-2xl font-black text-slate-900">PDF 签名</h1>
        <p className="mt-1 text-sm text-slate-500">手写签名或上传签名图片，添加到 PDF 指定位置。</p>
      </div>

      <div className="flex flex-1 gap-6 min-h-[400px]">
        <div className="flex-1 flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm overflow-auto">
          {!file ? (
            <div
              className="flex flex-1 flex-col items-center justify-center text-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-6 transition hover:border-red-400 hover:bg-red-50/50"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
                <Icon name="signature" size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">拖拽 PDF 文件到此处</h3>
              <p className="mt-2 text-slate-500">或点击右侧按钮选择文件</p>
              <button onClick={handleSelectFiles} className="mt-6 rounded-2xl bg-slate-900 px-6 py-3 font-bold text-white shadow-lg transition hover:bg-slate-800">
                选择文件
              </button>
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-slate-700">{file.name} — {totalPages} 页</span>
                <button onClick={() => { setFile(null); setFilePath(""); setPdfUrl(null); setTotalPages(0); }} className="text-sm font-bold text-slate-400 hover:text-red-600">重新选择</button>
              </div>
              {pdfUrl && (
                <div className="flex-1 flex items-center justify-center overflow-auto">
                  <div className="relative inline-block">
                    <Document file={pdfUrl} loading={<div className="text-slate-500 font-bold p-8">加载中...</div>}>
                      <Page pageNumber={Math.min(pageNum, totalPages)} scale={0.6} renderTextLayer={false} renderAnnotationLayer={false} />
                    </Document>
                    {/* Signature position indicator */}
                    <div className={signPosStyle.className} style={signPosStyle.style}>
                      {signatureDataUrl ? (
                        <img src={signatureDataUrl} alt="签名" className="max-w-full max-h-full object-contain p-1" />
                      ) : (
                        <span className="text-xs text-red-400 font-bold">签名</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-[300px] shrink-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-900 text-lg">签名设置</h3>
          <div className="mt-4 flex-1 space-y-4 text-sm text-slate-600">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">签名方式</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setSignMode("draw")} className={`rounded-xl px-3 py-2 text-sm font-bold border transition ${signMode === "draw" ? "bg-red-50 text-red-600 border-red-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                  手写签名
                </button>
                <button onClick={() => { setSignMode("upload"); handleImageUpload(); }} className={`rounded-xl px-3 py-2 text-sm font-bold border transition ${signMode === "upload" ? "bg-red-50 text-red-600 border-red-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                  上传图片
                </button>
              </div>
            </div>

            {signMode === "draw" && !signatureDataUrl && (
              <SignaturePad onSave={(dataUrl) => { setSignatureDataUrl(dataUrl); setSignMode("draw"); }} />
            )}
            {signatureDataUrl && (
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-green-50 border border-green-100 flex items-center gap-3">
                  <img src={signatureDataUrl} alt="签名" className="max-h-8 object-contain" />
                  <span className="text-xs font-bold text-green-700">签名已就绪</span>
                </div>
                <button onClick={() => setSignatureDataUrl(null)} className="w-full rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-600 transition">
                  清除签名重新来
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">签名页码</label>
              <input type="number" min="1" max={totalPages || 1} value={pageNum} onChange={(e) => setPageNum(Number(e.target.value))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-slate-900 outline-none focus:border-red-500" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">签名位置</label>
              <div className="grid grid-cols-3 gap-2">
                {SIGN_POSITIONS.map(p => (
                  <button key={p.key} onClick={() => setPosition(p.key)} className={`rounded-xl px-2 py-2 text-xs font-bold border transition ${position === p.key ? "bg-red-50 text-red-600 border-red-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">签名大小: {signSize}px</label>
              <input type="range" min="80" max="300" value={signSize} onChange={(e) => setSignSize(Number(e.target.value))} className="w-full accent-red-600" />
            </div>
          </div>
          <button
            onClick={executeSign}
            disabled={!file || !signatureDataUrl || isProcessing}
            className={`mt-auto w-full rounded-2xl px-4 py-4 font-bold text-white shadow-lg transition ${!file || !signatureDataUrl || isProcessing ? "bg-slate-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 hover:shadow-red-600/20"}`}
          >
            {isProcessing ? "签名中..." : "添加签名"}
          </button>
        </div>
      </div>
    </div>
    </MembershipGuard>
  );
}
