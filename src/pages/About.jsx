import React from "react";
import Icon from "../components/Icon";

export default function About() {
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
          <div className="mt-2 text-sm text-slate-500 font-medium">版本 1.0.2 (桌面专业版)</div>
          
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
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="font-bold text-slate-900 text-sm">Electron & React</div>
                <div className="text-xs text-slate-500 mt-1">构建跨平台、高性能的现代桌面应用引擎与用户界面栈。</div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="font-bold text-slate-900 text-sm">Tailwind CSS</div>
                <div className="text-xs text-slate-500 mt-1">提供极致流畅且极其美观的原子化样式设计系统。</div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="font-bold text-slate-900 text-sm">pdf-lib</div>
                <div className="text-xs text-slate-500 mt-1">在 JavaScript 层实现极速无损的 PDF 合并与拆分。</div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="font-bold text-slate-900 text-sm">PyMuPDF (fitz)</div>
                <div className="text-xs text-slate-500 mt-1">底层的重型渲染引擎，实现极速提取文本、高级瘦身与 AES-256 加解密。</div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="font-bold text-slate-900 text-sm">pdf2docx & pywin32</div>
                <div className="text-xs text-slate-500 mt-1">跨语言调用的 Python 后台引擎，提供全方位的 Office 格式互转与智能排版。</div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="font-bold text-slate-900 text-sm">rembg</div>
                <div className="text-xs text-slate-500 mt-1">基于深度学习模型 (U2-Net) 实现的图像智能去背景技术。</div>
              </div>
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
