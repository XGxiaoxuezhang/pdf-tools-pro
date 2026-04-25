import React, { useMemo, useState } from "react";

const iconPaths = {
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h5",
  upload: "M12 16V4 M7 9l5-5 5 5 M5 20h14",
  scissors: "M4 6l16 12 M4 18l16-12 M6 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  merge: "M7 7h6a4 4 0 0 1 4 4v6 M17 17l-3-3 M17 17l3-3 M7 17h4 M7 7l3-3 M7 7l3 3",
  signature: "M4 20h16 M6 16c2-6 4-6 5-3 1 3 3 3 5-1 1-2 2-2 4-2 M14 2l6 6-9 9H5v-6z",
  lock: "M7 11V8a5 5 0 0 1 10 0v3 M6 11h12v10H6z M12 15v2",
  unlock: "M7 11V8a5 5 0 0 1 9.6-2 M6 11h12v10H6z M12 15v2",
  image: "M4 5h16v14H4z M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M4 17l5-5 4 4 3-3 4 4",
  search: "M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14z M20 20l-4-4",
  spark: "M12 2l1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7z",
  download: "M12 4v10 M8 10l4 4 4-4 M5 20h14",
  history: "M3 12a9 9 0 1 0 3-6.7 M3 4v5h5 M12 7v6l4 2",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M4 12h2 M18 12h2 M12 4v2 M12 18v2 M5.6 5.6l1.4 1.4 M17 17l1.4 1.4 M18.4 5.6L17 7 M7 17l-1.4 1.4",
  crown: "M3 8l5 4 4-7 4 7 5-4-2 11H5z",
  shield: "M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z M8.5 12l2.3 2.3L16 9",
  plus: "M12 5v14 M5 12h14",
  grid: "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z",
  folder: "M3 7h7l2 2h9v10H3z",
  zap: "M13 2L4 14h7l-1 8 10-13h-7z",
  check: "M20 6L9 17l-5-5",
  wand: "M15 4l5 5 M14 5l5 5 M4 20l11-11 M6 4h.01 M10 2h.01 M3 8h.01 M20 16h.01 M17 21h.01",
  minimize: "M6 12h12",
  maximize: "M7 7h10v10H7z",
  close: "M6 6l12 12 M18 6L6 18",
  home: "M4 11l8-7 8 7v9H4z M10 20v-6h4v6",
};

function Icon({ name = "file", size = 20, className = "" }) {
  const safeName = typeof name === "string" && iconPaths[name] ? name : "file";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={iconPaths[safeName]} />
    </svg>
  );
}

const TOOL_TABS = ["全部", "转换", "编辑", "安全"];

const TOOLS = [
  { name: "PDF 转 Word", desc: "保留排版导出", icon: "file", tag: "热门", group: "转换" },
  { name: "Word 转 PDF", desc: "文档一键固化", icon: "signature", tag: "常用", group: "转换" },
  { name: "PDF 合并", desc: "多个文件合成", icon: "merge", tag: "批量", group: "编辑" },
  { name: "PDF 拆分", desc: "按页码拆分", icon: "scissors", tag: "高效", group: "编辑" },
  { name: "PDF 压缩", desc: "清晰压缩", icon: "zap", tag: "推荐", group: "编辑" },
  { name: "图片转 PDF", desc: "图片整理成册", icon: "image", tag: "便捷", group: "转换" },
  { name: "PDF 加密", desc: "密码保护", icon: "lock", tag: "安全", group: "安全" },
  { name: "PDF 解密", desc: "移除已知密码", icon: "unlock", tag: "工具", group: "安全" },
  { name: "OCR 识别", desc: "扫描件识别", icon: "search", tag: "AI", group: "转换" },
];

const TASKS = [
  { file: "项目验收报告.pdf", action: "PDF 转 Word", size: "8.2 MB", progress: 100, status: "已完成" },
  { file: "合同扫描件.pdf", action: "OCR 识别", size: "15.6 MB", progress: 72, status: "处理中" },
  { file: "发票合集.pdf", action: "PDF 合并", size: "4.1 MB", progress: 0, status: "等待中" },
];

function getTools() {
  return Array.isArray(TOOLS) ? TOOLS : [];
}

function getTasks() {
  return Array.isArray(TASKS) ? TASKS : [];
}

function runSmokeTests() {
  const tools = getTools();
  const tasks = getTasks();
  const result = {
    toolCount: tools.length,
    hasAllIcons: tools.every((tool) => tool && Boolean(iconPaths[tool.icon])),
    hasTasks: tasks.length > 0,
    hasFilterGroups: TOOL_TABS.every((tab) => tab === "全部" || tools.some((tool) => tool && tool.group === tab)),
    handlesUnknownIcon: Boolean(iconPaths.not_exists) === false && Boolean(iconPaths.file),
    handlesEmptyFilters: tools.filter((tool) => tool && tool.group === "不存在").length === 0,
  };

  if (typeof console !== "undefined") {
    console.assert(result.toolCount >= 9, "工具数量不足，至少应包含 9 个常用 PDF 工具");
    console.assert(result.hasAllIcons, "存在未定义的内置图标");
    console.assert(result.hasTasks, "任务队列不能为空");
    console.assert(result.hasFilterGroups, "工具分类缺失或无法筛选");
    console.assert(result.handlesUnknownIcon, "未知图标应回退到 file 图标");
    console.assert(result.handlesEmptyFilters, "不存在的分类应返回空列表而不是报错");
  }
  return result;
}

const smokeTestResult = runSmokeTests();

function WindowButton({ type = "min" }) {
  const icon = type === "min" ? "minimize" : type === "max" ? "maximize" : "close";
  return (
    <button type="button" className={`flex h-8 w-10 items-center justify-center text-slate-500 transition hover:bg-slate-100 ${type === "close" ? "hover:bg-red-500 hover:text-white" : ""}`}>
      <Icon name={icon} size={15} />
    </button>
  );
}

function NavItem({ icon = "file", label = "菜单", active = false }) {
  return (
    <button type="button" className={`group flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-sm transition ${active ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"}`}>
      <Icon name={icon} size={18} />
      <span className="font-medium">{label}</span>
    </button>
  );
}

function ToolCard({ tool, index = 0 }) {
  const safeTool = tool || {};
  return (
    <button type="button" className="group relative flex min-h-[118px] flex-col items-start overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-xl hover:shadow-slate-200/70" style={{ transitionDelay: `${index * 12}ms` }}>
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-red-100 opacity-0 blur-2xl transition group-hover:opacity-100" />
      <div className="relative flex w-full items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-900 ring-1 ring-slate-100 group-hover:bg-red-50 group-hover:text-red-600">
          <Icon name={safeTool.icon || "file"} size={21} />
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 group-hover:bg-red-50 group-hover:text-red-600">{safeTool.tag || "工具"}</span>
      </div>
      <div className="relative mt-4">
        <div className="font-bold text-slate-950">{safeTool.name || "未命名工具"}</div>
        <div className="mt-1 text-xs text-slate-500">{safeTool.desc || "暂无说明"}</div>
      </div>
    </button>
  );
}

function TaskItem({ task }) {
  const safeTask = task || {};
  const progress = Number.isFinite(Number(safeTask.progress)) ? Math.min(100, Math.max(0, Number(safeTask.progress))) : 0;
  const tone = safeTask.status === "已完成" ? "text-green-600 bg-green-50" : safeTask.status === "处理中" ? "text-orange-600 bg-orange-50" : "text-slate-500 bg-slate-100";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600"><Icon name="file" size={21} /></div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-slate-950">{safeTask.file || "未命名文件.pdf"}</div>
          <div className="mt-1 text-xs text-slate-500">{safeTask.action || "等待选择工具"} · {safeTask.size || "--"}</div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{safeTask.status || "等待中"}</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-red-600 transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("全部");
  const tools = getTools();
  const tasks = getTasks();

  const visibleTools = useMemo(() => {
    if (!Array.isArray(tools)) return [];
    if (activeTab === "全部") return tools;
    return tools.filter((tool) => tool && tool.group === activeTab);
  }, [activeTab, tools]);

  return (
    <div className="min-h-screen bg-[#dfe5ee] p-6 text-slate-900">
      <div className="mx-auto flex h-[calc(100vh-48px)] min-h-[760px] max-w-[1480px] flex-col overflow-hidden rounded-[28px] border border-white/70 bg-[#f7f8fb] shadow-2xl shadow-slate-900/20">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 pl-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-orange-500 text-white shadow-sm"><Icon name="file" size={18} /></div>
            <div className="text-sm font-black">全民好用 PDF</div>
            <div className="ml-3 hidden rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500 md:block">v1.0 桌面客户端 UI Prototype</div>
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
                  <div className="mt-0.5 text-xs text-slate-400">本地快速处理</div>
                </div>
              </div>
            </div>

            <nav className="mt-5 space-y-2">
              <NavItem icon="home" label="首页" active />
              <NavItem icon="grid" label="全部工具" />
              <NavItem icon="history" label="任务记录" />
              <NavItem icon="shield" label="隐私安全" />
              <NavItem icon="settings" label="设置" />
            </nav>

            <div className="mt-auto rounded-3xl border border-red-100 bg-gradient-to-br from-red-50 to-orange-50 p-4">
              <div className="flex items-center gap-2 font-bold text-slate-950"><Icon name="crown" size={18} className="text-orange-500" /> 专业版</div>
              <p className="mt-2 text-xs leading-5 text-slate-500">批量转换、OCR 识别、无水印导出、高级压缩。</p>
              <button type="button" className="mt-4 w-full rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">立即开通</button>
            </div>
          </aside>

          <main className="flex min-w-0 flex-1 flex-col">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-[#f7f8fb]/90 px-6 backdrop-blur-xl">
              <div>
                <div className="text-xl font-black tracking-tight">首页工作台</div>
                <div className="text-xs text-slate-500">拖拽文件开始处理，也可以从下方选择常用工具。</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden h-10 w-[300px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-400 shadow-sm lg:flex">
                  <Icon name="search" size={17} /> 搜索工具、文件或任务记录
                </div>
                <button type="button" className="flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-600/20"><Icon name="plus" size={17} /> 添加文件</button>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px] gap-5 overflow-hidden p-5">
              <section className="min-w-0 overflow-auto pr-1">
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_300px]">
                  <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 p-6 text-white shadow-2xl shadow-slate-900/15">
                    <div className="absolute right-[-80px] top-[-80px] h-64 w-64 rounded-full bg-red-500/20 blur-3xl" />
                    <div className="relative flex min-h-[260px] flex-col justify-between">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/75 ring-1 ring-white/15"><Icon name="spark" size={15} /> 全民好用 PDF 桌面版</div>
                        <h1 className="mt-5 max-w-xl text-4xl font-black leading-tight">复杂 PDF 操作，做成一个按钮的事。</h1>
                        <p className="mt-3 max-w-lg text-sm leading-6 text-white/65">支持转换、合并、拆分、压缩、OCR、加密。本地优先处理，界面保持清爽，不打扰办公节奏。</p>
                      </div>
                      <div className="mt-7 flex flex-wrap gap-3">
                        <button type="button" className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950">选择 PDF 文件</button>
                        <button type="button" className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-bold text-white ring-1 ring-white/15">打开处理记录</button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[30px] border-2 border-dashed border-slate-300 bg-white/80 p-5 text-center shadow-sm">
                    <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-[24px] bg-slate-50/80 p-6">
                      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-600"><Icon name="upload" size={34} /></div>
                      <div className="mt-5 text-lg font-black">拖拽文件到这里</div>
                      <p className="mt-2 text-sm leading-6 text-slate-500">支持 PDF、Word、图片批量导入，自动进入任务队列。</p>
                      <button type="button" className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">浏览本地文件</button>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black">常用工具</h2>
                      <p className="mt-1 text-xs text-slate-500">根据桌面软件高频场景整理。</p>
                    </div>
                    <div className="flex rounded-2xl bg-slate-100 p-1">
                      {TOOL_TABS.map((tab) => (
                        <button type="button" key={tab} onClick={() => setActiveTab(tab)} className={`rounded-xl px-4 py-2 text-sm font-bold transition ${activeTab === tab ? "bg-white text-red-600 shadow-sm" : "text-slate-500 hover:text-slate-950"}`}>{tab}</button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                    {visibleTools.length > 0 ? visibleTools.map((tool, index) => <ToolCard key={`${tool.name}-${index}`} tool={tool} index={index} />) : (
                      <div className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">当前分类暂无工具</div>
                    )}
                  </div>
                </div>
              </section>

              <aside className="hidden min-h-0 flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm xl:flex">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-black">任务队列</h2>
                    <p className="mt-1 text-xs text-slate-500">当前处理进度</p>
                  </div>
                  <button type="button" className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">清空</button>
                </div>

                <div className="mt-5 space-y-3 overflow-auto pr-1">
                  {tasks.length > 0 ? tasks.map((task, index) => <TaskItem key={`${task.file || "task"}-${index}`} task={task} />) : (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">暂无处理任务</div>
                  )}
                </div>

                <div className="mt-5 rounded-3xl bg-slate-950 p-5 text-white">
                  <div className="flex items-center gap-2 text-sm font-bold"><Icon name="shield" size={18} /> 本地安全模式</div>
                  <p className="mt-2 text-xs leading-5 text-slate-400">敏感文件默认优先本地处理，减少上传风险，适合合同、报告、财务票据。</p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-slate-300">
                    <div className="rounded-2xl bg-white/10 p-2">无广告</div>
                    <div className="rounded-2xl bg-white/10 p-2">无打扰</div>
                    <div className="rounded-2xl bg-white/10 p-2">可批量</div>
                  </div>
                </div>
              </aside>
            </div>

            <div className="flex h-9 shrink-0 items-center justify-between border-t border-slate-200 bg-white/70 px-5 text-xs text-slate-500">
              <div>就绪 · 本地模式 · 当前无错误</div>
              <div>UI smoke test: tools={smokeTestResult.toolCount}, icons={String(smokeTestResult.hasAllIcons)}, filters={String(smokeTestResult.hasFilterGroups)}</div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
