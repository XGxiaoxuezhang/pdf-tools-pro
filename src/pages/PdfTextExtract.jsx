import React, { useState } from "react";
import Icon from "../components/Icon";
import { addTask } from "../lib/taskStore";
import { pdfjs } from "react-pdf";
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { MembershipGuard } from "../lib/featureGate";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

async function extractText(buffer) {
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map(item => item.str).join(" ").replace(/\s+/g, " ").trim();
    pages.push({ page: i, text });
  }
  return pages;
}

export default function PdfTextExtract() {
  const [file, setFile] = useState(null);
  const [filePath, setFilePath] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [pages, setPages] = useState([]);
  const [copied, setCopied] = useState(false);

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
        setPages([]);
      }
    }
  };

  const handleFileDrop = async (e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).find(f => f.type === "application/pdf" || f.name.endsWith(".pdf"));
    if (dropped) {
      setFile(dropped);
      setFilePath(dropped.path || "");
      setPages([]);
    }
  };

  const executeExtract = async () => {
    if (!file) return alert("请先选择 PDF 文件！");
    setIsProcessing(true);
    setPages([]);
    try {
      let buffer;
      if (window.electronAPI && filePath) {
        buffer = await window.electronAPI.readFile(filePath);
      } else if (file.arrayBuffer) {
        buffer = await file.arrayBuffer();
      } else {
        return alert("无法读取文件");
      }
      const result = await extractText(buffer);
      setPages(result);
      const totalChars = result.reduce((sum, p) => sum + p.text.length, 0);
      addTask({ file: file.name, action: "提取文字", size: `${totalChars} 字符 / ${result.length} 页`, progress: 100, status: "已完成" });
      if (totalChars === 0) alert("未提取到文字，可能是扫描件 PDF（纯图片），暂不支持 OCR。");
    } catch (err) {
      console.error(err);
      alert("提取失败，请检查文件是否损坏。");
    } finally {
      setIsProcessing(false);
    }
  };

  const copyAll = () => {
    const allText = pages.map(p => `--- 第 ${p.page} 页 ---\n${p.text}`).join("\n\n");
    navigator.clipboard.writeText(allText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const saveAsTxt = async () => {
    if (!window.electronAPI) return;
    const allText = pages.map(p => `--- 第 ${p.page} 页 ---\n${p.text}`).join("\n\n");
    const defaultName = file.name.replace(/\.[^/.]+$/, "") + ".txt";
    const { canceled, filePath: savePath } = await window.electronAPI.showSaveDialog({
      title: "保存文本文件",
      defaultPath: defaultName,
      filters: [{ name: "Text Files", extensions: ["txt"] }],
    });
    if (!canceled && savePath) {
      const bytes = new TextEncoder().encode(allText);
      await window.electronAPI.saveFile(savePath, bytes);
    }
  };

  const allText = pages.map(p => p.text).join(" ");
  const charCount = allText.length;
  const wordCount = allText.split(/\s+/).filter(Boolean).length;

  return (
    <MembershipGuard>
    <div className="flex h-full flex-col p-6 overflow-auto">
      <div className="mb-6 shrink-0">
        <h1 className="text-2xl font-black text-slate-900">PDF 文字提取</h1>
        <p className="mt-1 text-sm text-slate-500">从 PDF 中提取所有文字内容，支持复制和导出。</p>
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
                <Icon name="file" size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">拖拽 PDF 文件到此处</h3>
              <p className="mt-2 text-slate-500">或点击右侧按钮选择文件</p>
              <button onClick={handleSelectFiles} className="mt-6 rounded-2xl bg-slate-900 px-6 py-3 font-bold text-white shadow-lg transition hover:bg-slate-800">
                选择文件
              </button>
            </div>
          ) : pages.length > 0 ? (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-slate-700">{file.name} — {pages.length} 页</span>
                <button onClick={() => { setFile(null); setFilePath(""); setPages([]); }} className="text-sm font-bold text-slate-400 hover:text-red-600">重新选择</button>
              </div>
              <div className="flex-1 overflow-auto space-y-4">
                {pages.map((p) => (
                  <div key={p.page} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-500">第 {p.page} 页</span>
                      <span className="text-xs text-slate-400">{p.text.length} 字符</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{p.text || "（此页无可提取文字）"}</p>
                  </div>
                ))}
              </div>
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
              <div className="mt-4 text-sm text-slate-400">{isProcessing ? "正在提取文字..." : "点击右侧「提取」按钮开始"}</div>
            </div>
          )}
        </div>

        <div className="w-[280px] shrink-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-900 text-lg">文字提取</h3>
          <p className="mt-2 text-sm text-slate-500">提取 PDF 中的可选文字，支持复制和导出 TXT。</p>

          {pages.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-slate-50 p-3 text-center">
                  <div className="text-lg font-black text-slate-900">{charCount.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">总字符</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-center">
                  <div className="text-lg font-black text-slate-900">{wordCount.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">总词数</div>
                </div>
              </div>
              <button onClick={copyAll} className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition">
                {copied ? "已复制！" : "复制全部文字"}
              </button>
              <button onClick={saveAsTxt} className="w-full rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200 transition">
                导出为 TXT
              </button>
            </div>
          )}

          <div className="mt-4 flex-1 text-xs text-slate-500 space-y-2">
            <p>仅支持提取可选文字的 PDF。</p>
            <p>扫描件（纯图片）需要 OCR 功能，暂不支持。</p>
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-700">
              全程本地处理，不会上传文件。
            </div>
          </div>
          <button
            onClick={executeExtract}
            disabled={!file || isProcessing}
            className={`mt-auto w-full rounded-2xl px-4 py-4 font-bold text-white shadow-lg transition ${!file || isProcessing ? "bg-slate-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 hover:shadow-red-600/20"}`}
          >
            {isProcessing ? "提取中..." : "提取文字"}
          </button>
        </div>
      </div>
    </div>
    </MembershipGuard>
  );
}
