import React from "react";
import { Link, useLocation } from "react-router-dom";
import Icon from "./Icon";

function WindowButton({ type = "min" }) {
  const icon = type === "min" ? "minimize" : type === "max" ? "maximize" : "close";
  const handleWindowAction = () => {
    if (window.electronAPI) {
      window.electronAPI.windowAction(type);
    }
  };
  return (
    <button type="button" onClick={handleWindowAction} className={`no-drag-region flex h-8 w-10 items-center justify-center text-slate-500 transition hover:bg-slate-100 ${type === "close" ? "hover:bg-red-500 hover:text-white" : ""}`}>
      <Icon name={icon} size={15} />
    </button>
  );
}

function NavItem({ icon = "file", label = "菜单", to = "/" }) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link to={to} className={`group flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-sm transition ${active ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"}`}>
      <Icon name={icon} size={18} />
      <span className="font-medium">{label}</span>
    </Link>
  );
}

export default function Layout({ children }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f7f8fb] text-slate-900">
      <div className="flex flex-col h-full overflow-hidden">
        <div className="drag-region flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 pl-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <img src="./logo.png" alt="全民好用PDF Logo" className="h-8 object-contain drop-shadow-sm" />
            <div className="text-sm font-black">全民好用 PDF</div>
            <div className="ml-3 hidden rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500 md:block">v1.0.5 桌面客户端</div>
          </div>
          <div className="flex items-center">
            <WindowButton type="min" />
            <WindowButton type="max" />
            <WindowButton type="close" />
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <aside className="flex w-[248px] shrink-0 flex-col border-r border-slate-200 bg-white/75 p-4 backdrop-blur-xl">
            <div className="rounded-3xl bg-slate-950 p-4 text-white shadow-xl shadow-slate-900/10">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10"><Icon name="spark" size={22} /></div>
                <div>
                  <div className="font-black">PDF 工具箱</div>
                  <div className="mt-0.5 text-xs text-slate-400">本地极速处理</div>
                </div>
              </div>
            </div>

            <nav className="mt-5 space-y-2">
              <NavItem icon="home" label="首页工作台" to="/" />
              <NavItem icon="arrowLeft" label="格式互转" to="/convert" />
              <NavItem icon="merge" label="PDF 合并" to="/merge" />
              <NavItem icon="scissors" label="PDF 拆分" to="/split" />
              <NavItem icon="search" label="PDF 预览/编辑" to="/viewer" />
              <NavItem icon="zap" label="PDF 压缩" to="/compress" />
              <NavItem icon="lock" label="PDF 安全中心" to="/secure" />
              <NavItem icon="settings" label="PDF 旋转" to="/rotate" />
              <NavItem icon="shield" label="PDF 水印" to="/watermark" />
              <NavItem icon="layers" label="PDF 页面重排" to="/reorder" />
              <NavItem icon="grid" label="批量处理" to="/batch" />
              <NavItem icon="image" label="PDF 提取图片" to="/extract-images" />
              <NavItem icon="image" label="图片格式转换" to="/image-convert" />
              <NavItem icon="file" label="PDF 页码页眉页脚" to="/page-number" />
              <NavItem icon="search" label="PDF 文字提取" to="/text-extract" />
              <NavItem icon="signature" label="PDF 签名" to="/sign" />
              <NavItem icon="search" label="PDF 对比" to="/compare" />
              <NavItem icon="history" label="任务记录" to="/history" />
              <NavItem icon="user" label="关于我们" to="/about" />
            </nav>
          </aside>

          <main className="flex min-w-0 flex-1 flex-col">
            {children}
            <div className="flex h-9 shrink-0 items-center justify-between border-t border-slate-200 bg-white/70 px-5 text-xs text-slate-500">
              <div>就绪 · 本地模式 · 全民好用引擎</div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
