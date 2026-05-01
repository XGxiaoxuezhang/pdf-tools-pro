import React, { useState } from "react";
import Icon from "../components/Icon";
import { addTask } from "../lib/taskStore";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

async function extractImages(buffer) {
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const images = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const opList = await page.getOperatorList();
    const resources = page.objs;

    for (let j = 0; j < opList.fnArray.length; j++) {
      if (
        opList.fnArray[j] === pdfjs.OPS.paintImageXObject ||
        opList.fnArray[j] === pdfjs.OPS.paintJpegXObject
      ) {
        const name = opList.argsArray[j][0];
        try {
          const imgData = await new Promise((resolve, reject) => {
            if (resources.has(name)) {
              resolve(resources.get(name));
            } else {
              resources.get(name, (obj) => {
                if (obj) resolve(obj);
                else reject(new Error("Image not found"));
              });
            }
          });
          if (imgData && imgData.width > 1 && imgData.height > 1) {
            const blobUrl = await convertToBlobUrl(imgData);
            if (blobUrl) images.push({ blobUrl, page: i, name, width: imgData.width, height: imgData.height });
          }
        } catch { /* skip unreadable images */ }
      }
    }
  }
  return images;
}

async function convertToBlobUrl(imgData) {
  if (imgData.data instanceof Uint8Array || imgData.data instanceof Uint8ClampedArray) {
    const bytes = imgData.data;
    if (bytes[0] === 0xff && bytes[1] === 0xd8) {
      return URL.createObjectURL(new Blob([bytes], { type: "image/jpeg" }));
    }
    try {
      const rgba = new Uint8ClampedArray(imgData.width * imgData.height * 4);
      const len = Math.min(bytes.length, rgba.length);
      for (let k = 0; k < len; k++) rgba[k] = bytes[k];
      for (let k = len; k < rgba.length; k++) rgba[k] = 255;
      const canvas = document.createElement("canvas");
      canvas.width = imgData.width;
      canvas.height = imgData.height;
      const ctx = canvas.getContext("2d");
      ctx.putImageData(new ImageData(rgba, imgData.width, imgData.height), 0, 0);
      const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
      return blob ? URL.createObjectURL(blob) : null;
    } catch { return null; }
  }
  return null;
}

function triggerDownload(blobUrl, filename) {
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  a.click();
}

export default function PdfExtractImages() {
  const [file, setFile] = useState(null);
  const [filePath, setFilePath] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [images, setImages] = useState([]);
  const [numPages, setNumPages] = useState(null);

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
        setImages([]);
      }
    }
  };

  const handleFileDrop = async (e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).find(f => f.type === "application/pdf" || f.name.endsWith(".pdf"));
    if (dropped) {
      setFile(dropped);
      setFilePath(dropped.path || "");
      setImages([]);
    }
  };

  const executeExtract = async () => {
    if (!file) return alert("请先选择 PDF 文件！");
    setIsProcessing(true);
    setImages([]);
    try {
      let buffer;
      if (window.electronAPI && filePath) {
        buffer = await window.electronAPI.readFile(filePath);
      } else if (file.arrayBuffer) {
        buffer = await file.arrayBuffer();
      } else {
        return alert("无法读取文件");
      }
      const result = await extractImages(buffer);
      setImages(result);
      addTask({ file: file.name, action: "提取图片", size: `${result.length} 张图片`, progress: 100, status: "已完成" });
      if (result.length === 0) alert("未在 PDF 中找到图片。");
    } catch (err) {
      console.error(err);
      alert("提取失败，请检查文件是否损坏。");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAll = () => {
    if (window.electronAPI) {
      window.electronAPI.showOpenDialog({ properties: ["openDirectory"] }).then(async ({ canceled, filePaths }) => {
        if (canceled || !filePaths || !filePaths[0]) return;
        const dir = filePaths[0];
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          const resp = await fetch(img.blobUrl);
          const bytes = new Uint8Array(await resp.arrayBuffer());
          const name = `${file.name.replace(/\.[^/.]+$/, "")}_p${img.page}_${i + 1}.png`;
          const sep = dir.includes('/') ? '/' : '\\';
          await window.electronAPI.saveFile(dir + sep + name, bytes);
        }
        alert(`已保存 ${images.length} 张图片到指定目录。`);
      });
    } else {
      images.forEach((img, i) => triggerDownload(img.blobUrl, `page${img.page}_img${i + 1}.png`));
    }
  };

  return (
    <div className="flex h-full flex-col p-6 overflow-auto">
      <div className="mb-6 shrink-0">
        <h1 className="text-2xl font-black text-slate-900">PDF 提取图片</h1>
        <p className="mt-1 text-sm text-slate-500">从 PDF 中批量导出所有嵌入的图片。</p>
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
                <Icon name="image" size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">拖拽 PDF 文件到此处</h3>
              <p className="mt-2 text-slate-500">或点击右侧按钮选择文件</p>
              <button onClick={handleSelectFiles} className="mt-6 rounded-2xl bg-slate-900 px-6 py-3 font-bold text-white shadow-lg transition hover:bg-slate-800">
                选择文件
              </button>
            </div>
          ) : (
            <div className="flex flex-col flex-1">
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-slate-700">{file.name}</span>
                <button onClick={() => { setFile(null); setFilePath(""); setImages([]); }} className="text-sm font-bold text-slate-400 hover:text-red-600">重新选择</button>
              </div>
              {images.length > 0 ? (
                <div className="flex-1 overflow-auto">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {images.map((img, i) => (
                      <div key={i} className="group rounded-2xl border border-slate-200 bg-white p-3 overflow-hidden">
                        <div className="aspect-[4/3] bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center">
                          <img src={img.blobUrl} alt={`Page ${img.page}`} className="max-w-full max-h-full object-contain" />
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-slate-500">第 {img.page} 页 · {img.width}×{img.height}</span>
                          <button onClick={() => triggerDownload(img.blobUrl, `page${img.page}_img${i + 1}.png`)} className="text-xs font-bold text-red-600 opacity-0 group-hover:opacity-100 transition">下载</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center text-slate-400 text-sm">
                  {isProcessing ? "正在提取图片..." : "点击右侧「提取」按钮开始"}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-[280px] shrink-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-900 text-lg">提取图片</h3>
          <p className="mt-2 text-sm text-slate-500">自动识别 PDF 内嵌的所有图片，支持 PNG 和 JPEG 格式。</p>
          {images.length > 0 && (
            <div className="mt-4 p-4 rounded-2xl bg-green-50 border border-green-100">
              <div className="text-sm font-bold text-green-800">已提取 {images.length} 张图片</div>
              <button onClick={downloadAll} className="mt-2 w-full rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 transition">
                全部下载
              </button>
            </div>
          )}
          <div className="mt-4 flex-1 text-xs text-slate-500 space-y-2">
            <p>支持提取嵌入的 PNG 和 JPEG 图片。</p>
            <p>矢量图形和文字无法作为图片提取。</p>
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-700">
              全程本地处理，不会上传文件。
            </div>
          </div>
          <button
            onClick={executeExtract}
            disabled={!file || isProcessing}
            className={`mt-auto w-full rounded-2xl px-4 py-4 font-bold text-white shadow-lg transition ${!file || isProcessing ? "bg-slate-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 hover:shadow-red-600/20"}`}
          >
            {isProcessing ? "提取中..." : "提取图片"}
          </button>
        </div>
      </div>
    </div>
  );
}
