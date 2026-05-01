import React, { useState, useEffect } from "react";
import Icon from "../components/Icon";

export default function About() {
  const [version, setVersion] = useState("1.0.5");
  const [updateStatus, setUpdateStatus] = useState(null); // null | "checking" | "up-to-date" | "available" | "error"
  const [updateInfo, setUpdateInfo] = useState(null);

  useEffect(() => {
    if (window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then(v => { if (v) setVersion(v); });
    }
    // Auto-check on mount
    checkUpdate();
  }, []);

  const checkUpdate = async () => {
    if (!window.electronAPI?.checkForUpdates) return;
    setUpdateStatus("checking");
    try {
      const result = await window.electronAPI.checkForUpdates();
      if (result.error) {
        setUpdateStatus("error");
        setUpdateInfo({ error: result.error });
      } else if (result.hasUpdate) {
        setUpdateStatus("available");
        setUpdateInfo(result);
      } else {
        setUpdateStatus("up-to-date");
        setUpdateInfo(result);
      }
    } catch {
      setUpdateStatus("error");
    }
  };

  return (
    <div className="flex h-full flex-col p-6 overflow-auto">
      <div className="mb-6 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900">关于我们</h1>
          <p className="mt-1 text-sm text-slate-500">全民好用 PDF，您桌面上的终极开源生产力工具。</p>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-[500px]">
        <div className="flex-1 flex flex-col rounded-3xl border border-slate-200 bg-white p-8 shadow-sm items-center text-center overflow-auto">

          <img src="./logo.png" alt="全民好用PDF Logo" className="h-28 object-contain drop-shadow-md mb-6" />
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">全民好用 PDF</h2>
          <div className="mt-2 text-sm text-slate-500 font-medium">版本 {version} (桌面专业版)</div>

          {/* Update check */}
          <div className="mt-4">
            {updateStatus === "checking" && (
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm text-blue-700">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                正在检查更新...
              </div>
            )}
            {updateStatus === "up-to-date" && (
              <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm text-green-700">
                <Icon name="check" size={16} />
                已是最新版本
              </div>
            )}
            {updateStatus === "available" && updateInfo && (
              <div className="inline-flex items-center gap-3 rounded-full bg-orange-50 px-4 py-2 text-sm text-orange-700">
                <span>发现新版本 v{updateInfo.latestVersion}</span>
                <button
                  onClick={() => window.electronAPI?.openExternal(updateInfo.downloadUrl)}
                  className="rounded-lg bg-orange-600 px-3 py-1 text-xs font-bold text-white hover:bg-orange-700 transition"
                >
                  前往下载
                </button>
              </div>
            )}
            {updateStatus === "error" && (
              <button onClick={checkUpdate} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 transition">
                检查更新失败，点击重试
              </button>
            )}
            {!updateStatus && (
              <button onClick={checkUpdate} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 transition">
                检查更新
              </button>
            )}
          </div>

          {/* GitHub links */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => window.electronAPI?.openExternal("https://github.com/XGxiaoxuezhang/pdf-tools-pro")}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition"
            >
              <Icon name="code" size={16} />
              GitHub 仓库
            </button>
            <button
              onClick={() => window.electronAPI?.openExternal("https://ghfast.top/https://github.com/XGxiaoxuezhang/pdf-tools-pro/releases")}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200 transition"
            >
              <Icon name="download" size={16} />
              GitHub 加速下载
            </button>
          </div>

          <div className="mt-8 rounded-2xl bg-red-50 text-red-700 px-6 py-4 inline-flex items-center gap-3">
            <Icon name="user" size={20} />
            <span className="font-bold">作者：朱澄亮</span>
          </div>

          <p className="mt-8 text-sm text-slate-600 max-w-xl leading-relaxed">
            这是一款专注于为您提供极致本地化体验的 PDF 全能工具箱。无需联网，所有文件处理都在您的电脑本地完成，极大保障了文档的安全性与隐私。
          </p>

          <div className="mt-10 w-full max-w-2xl text-left">
            <h3 className="font-bold text-slate-900 text-lg mb-4 flex items-center gap-2">
              <Icon name="code" size={20} /> 致谢开源力量
            </h3>
            <p className="text-sm text-slate-500 mb-6">本软件的诞生离不开以下出色的开源技术与社区贡献：</p>

            <div className="grid grid-cols-2 gap-4">
              {[
                { name: "Electron & React", desc: "构建跨平台、高性能的现代桌面应用引擎与用户界面栈。" },
                { name: "Tailwind CSS", desc: "提供极致流畅且极其美观的原子化样式设计系统。" },
                { name: "pdf-lib", desc: "在 JavaScript 层实现极速无损的 PDF 合并与拆分。" },
                { name: "PyMuPDF (fitz)", desc: "底层的重型渲染引擎，实现极速提取文本、高级瘦身与 AES-256 加解密。" },
                { name: "pdf2docx & pywin32", desc: "跨语言调用的 Python 后台引擎，提供全方位的 Office 格式互转与智能排版。" },
                { name: "react-pdf", desc: "基于 pdfjs-dist 的 PDF 渲染组件，提供页面预览与文字提取能力。" },
              ].map((item) => (
                <div key={item.name} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="font-bold text-slate-900 text-sm">{item.name}</div>
                  <div className="text-xs text-slate-500 mt-1">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-8 text-xs text-slate-400">
            Copyright © 2026 朱澄亮. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
