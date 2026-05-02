import React, { useState } from "react";
import Icon from "../components/Icon";
import { addTask } from "../lib/taskStore";
import { pdfjs } from "react-pdf";
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { MembershipGuard } from "../lib/featureGate";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

async function extractPageTexts(buffer) {
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map(item => item.str).join(" ");
    pages.push({ page: i, text });
  }
  return pages;
}

function diffText(textA, textB) {
  const wordsA = textA.split(/\s+/);
  const wordsB = textB.split(/\s+/);
  const maxLen = Math.max(wordsA.length, wordsB.length);
  const result = [];
  for (let i = 0; i < maxLen; i++) {
    const a = wordsA[i] || "";
    const b = wordsB[i] || "";
    if (a === b) {
      result.push({ type: "same", text: a });
    } else {
      if (a) result.push({ type: "removed", text: a });
      if (b) result.push({ type: "added", text: b });
    }
  }
  return result;
}

export default function PdfCompare() {
  const [fileA, setFileA] = useState(null);
  const [filePathA, setFilePathA] = useState("");
  const [fileB, setFileB] = useState(null);
  const [filePathB, setFilePathB] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState(null);

  const handleSelectFile = async (which) => {
    if (window.electronAPI) {
      const result = await window.electronAPI.showOpenDialog({
        properties: ["openFile"],
        filters: [{ name: "PDF Files", extensions: ["pdf"] }],
      });
      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        const path = result.filePaths[0];
        const name = path.split('\\').pop().split('/').pop();
        if (which === "A") {
          setFileA({ name });
          setFilePathA(path);
        } else {
          setFileB({ name });
          setFilePathB(path);
        }
      }
    }
  };

  const readFile = async (path, file) => {
    if (window.electronAPI && path) return window.electronAPI.readFile(path);
    if (file?.arrayBuffer) return file.arrayBuffer();
    return null;
  };

  const executeCompare = async () => {
    if (!fileA || !fileB) return alert("请选择两个 PDF 文件！");
    setIsProcessing(true);
    setResults([]);
    setStats(null);
    try {
      const bufA = await readFile(filePathA, fileA);
      const bufB = await readFile(filePathB, fileB);
      if (!bufA || !bufB) return alert("无法读取文件");

      const pagesA = await extractPageTexts(bufA);
      const pagesB = await extractPageTexts(bufB);
      const maxPages = Math.max(pagesA.length, pagesB.length);

      const diffs = [];
      let addedCount = 0;
      let removedCount = 0;
      let changedPages = 0;

      for (let i = 0; i < maxPages; i++) {
        const textA = pagesA[i]?.text || "";
        const textB = pagesB[i]?.text || "";
        const diff = diffText(textA, textB);
        const hasChanges = diff.some(d => d.type !== "same");
        if (hasChanges) changedPages++;
        diff.forEach(d => {
          if (d.type === "added") addedCount++;
          if (d.type === "removed") removedCount++;
        });
        diffs.push({ page: i + 1, diff, hasChanges, textA, textB });
      }

      setResults(diffs);
      setStats({ total: maxPages, changed: changedPages, added: addedCount, removed: removedCount });
      addTask({ file: `${fileA.name} vs ${fileB.name}`, action: "PDF 对比", size: `${changedPages} 页有差异`, progress: 100, status: "已完成" });
    } catch (err) {
      console.error(err);
      alert("对比失败，请检查文件是否损坏。");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <MembershipGuard>
    <div className="flex h-full flex-col p-6 overflow-auto">
      <div className="mb-6 shrink-0">
        <h1 className="text-2xl font-black text-slate-900">PDF 对比</h1>
        <p className="mt-1 text-sm text-slate-500">对比两个 PDF 文件，找出文字差异。</p>
      </div>

      <div className="flex flex-1 gap-6 min-h-[400px]">
        <div className="flex-1 flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm overflow-auto">
          {/* File selection */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            {[["A", fileA, filePathA, setFileA, setFilePathA], ["B", fileB, filePathB, setFileB, setFilePathB]].map(([label, f, , setF, setP]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-bold text-slate-500 mb-2">文件 {label}</div>
                {f ? (
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-medium text-slate-700">{f.name}</span>
                    <button onClick={() => { setF(null); setP(""); }} className="text-slate-400 hover:text-red-600"><Icon name="close" size={14} /></button>
                  </div>
                ) : (
                  <button onClick={() => handleSelectFile(label)} className="w-full rounded-xl bg-white border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-400 hover:border-red-400 hover:text-red-600 transition">
                    + 选择文件 {label}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                { label: "总页数", value: stats.total, color: "text-slate-900" },
                { label: "有差异页", value: stats.changed, color: "text-orange-600" },
                { label: "新增", value: stats.added, color: "text-green-600" },
                { label: "删除", value: stats.removed, color: "text-red-600" },
              ].map(s => (
                <div key={s.label} className="rounded-xl bg-slate-50 p-3 text-center">
                  <div className={`text-lg font-black ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Diff results */}
          <div className="flex-1 overflow-auto space-y-3">
            {results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Icon name="search" size={32} />
                <p className="mt-3 text-sm">选择两个 PDF 文件后点击"开始对比"</p>
              </div>
            ) : results.map((r) => (
              <div key={r.page} className={`rounded-xl border p-4 ${r.hasChanges ? "border-orange-200 bg-orange-50/30" : "border-slate-200 bg-white"}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-700">第 {r.page} 页</span>
                  {r.hasChanges ? (
                    <span className="text-xs font-bold text-orange-600">有差异</span>
                  ) : (
                    <span className="text-xs font-bold text-green-600">相同</span>
                  )}
                </div>
                {r.hasChanges && (
                  <div className="text-sm leading-relaxed">
                    {r.diff.filter(d => d.type !== "same").slice(0, 50).map((d, i) => (
                      <span key={i} className={d.type === "added" ? "bg-green-200 text-green-900 px-0.5 rounded" : d.type === "removed" ? "bg-red-200 text-red-900 line-through px-0.5 rounded" : ""}>
                        {d.text}{" "}
                      </span>
                    ))}
                    {r.diff.filter(d => d.type !== "same").length > 50 && <span className="text-xs text-slate-400">...更多差异</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="w-[260px] shrink-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-900 text-lg">对比说明</h3>
          <div className="mt-4 flex-1 text-sm text-slate-600 space-y-3">
            <p>对比两个 PDF 的文字内容差异。</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 rounded bg-green-200" />
                <span className="text-xs">新增内容</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 rounded bg-red-200" />
                <span className="text-xs">删除内容</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-700">
              仅对比文字内容，不对比格式和图片。
            </div>
          </div>
          <button
            onClick={executeCompare}
            disabled={!fileA || !fileB || isProcessing}
            className={`mt-auto w-full rounded-2xl px-4 py-4 font-bold text-white shadow-lg transition ${!fileA || !fileB || isProcessing ? "bg-slate-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 hover:shadow-red-600/20"}`}
          >
            {isProcessing ? "对比中..." : "开始对比"}
          </button>
        </div>
      </div>
    </div>
    </MembershipGuard>
  );
}
