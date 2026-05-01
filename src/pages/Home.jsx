import React, { useMemo, useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { getTasks, clearTasks } from "../lib/taskStore";

const TOOL_TABS = ["全部", "转换", "编辑", "安全"];

const TOOLS = [
  { name: "PDF 转 Word", desc: "保留排版导出", icon: "file", tag: "热门", group: "转换", to: "/convert" },
  { name: "Word 转 PDF", desc: "文档一键固化", icon: "signature", tag: "常用", group: "转换", to: "/convert" },
  { name: "PDF 合并", desc: "多个文件合成", icon: "merge", tag: "批量", group: "编辑", to: "/merge" },
  { name: "PDF 拆分", desc: "按页码拆分", icon: "scissors", tag: "高效", group: "编辑", to: "/split" },
  { name: "PDF 压缩", desc: "清晰压缩", icon: "zap", tag: "推荐", group: "编辑", to: "/compress" },
  { name: "图片转 PDF", desc: "图片整理成册", icon: "image", tag: "便捷", group: "转换", to: "/convert" },
  { name: "PDF 加密", desc: "密码保护", icon: "lock", tag: "安全", group: "安全", to: "/secure" },
  { name: "PDF 解密", desc: "移除已知密码", icon: "unlock", tag: "工具", group: "安全", to: "/secure" },
  { name: "PDF 阅读与编辑", desc: "查看与单页操作", icon: "search", tag: "新", group: "编辑", to: "/viewer" },
  { name: "PDF 旋转", desc: "旋转页面方向", icon: "settings", tag: "新", group: "编辑", to: "/rotate" },
  { name: "PDF 水印", desc: "添加文字水印", icon: "shield", tag: "新", group: "安全", to: "/watermark" },
  { name: "PDF 页面重排", desc: "拖拽调整顺序", icon: "layers", tag: "新", group: "编辑", to: "/reorder" },
  { name: "批量处理", desc: "统一处理多个文件", icon: "grid", tag: "新", group: "编辑", to: "/batch" },
  { name: "PDF 提取图片", desc: "批量导出嵌入图片", icon: "image", tag: "新", group: "编辑", to: "/extract-images" },
  { name: "图片格式转换", desc: "PNG/JPG/WebP 互转", icon: "image", tag: "新", group: "转换", to: "/image-convert" },
  { name: "PDF 页码页眉页脚", desc: "添加页码或页眉页脚", icon: "file", tag: "新", group: "编辑", to: "/page-number" },
  { name: "PDF 文字提取", desc: "提取 PDF 文字内容", icon: "search", tag: "新", group: "编辑", to: "/text-extract" },
  { name: "PDF 签名", desc: "手写或图片签名", icon: "signature", tag: "新", group: "安全", to: "/sign" },
  { name: "PDF 对比", desc: "两个版本找差异", icon: "search", tag: "新", group: "编辑", to: "/compare" },
];

function ToolCard({ tool, index = 0 }) {
  return (
    <Link to={tool.to || "/"} className="group relative flex min-h-[118px] flex-col items-start overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-xl hover:shadow-slate-200/70" style={{ transitionDelay: `${index * 12}ms` }}>
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-red-100 opacity-0 blur-2xl transition group-hover:opacity-100" />
      <div className="relative flex w-full items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-900 ring-1 ring-slate-100 group-hover:bg-red-50 group-hover:text-red-600">
          <Icon name={tool.icon || "file"} size={21} />
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 group-hover:bg-red-50 group-hover:text-red-600">{tool.tag || "工具"}</span>
      </div>
      <div className="relative mt-4">
        <div className="font-bold text-slate-950">{tool.name}</div>
        <div className="mt-1 text-xs text-slate-500">{tool.desc}</div>
      </div>
    </Link>
  );
}

function TaskItem({ task }) {
  const progress = Number.isFinite(Number(task.progress)) ? Math.min(100, Math.max(0, Number(task.progress))) : 0;
  const tone = task.status === "已完成" ? "text-green-600 bg-green-50" : task.status === "处理中" ? "text-orange-600 bg-orange-50" : "text-slate-500 bg-slate-100";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600"><Icon name="file" size={21} /></div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-slate-950">{task.file}</div>
          <div className="mt-1 text-xs text-slate-500">{task.action} · {task.size}</div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{task.status}</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-red-600 transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("全部");
  const [tasks, setTasks] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadTasks = () => setTasks(getTasks());
    loadTasks();
    window.addEventListener("tasks_updated", loadTasks);
    return () => window.removeEventListener("tasks_updated", loadTasks);
  }, []);

  const visibleTools = useMemo(() => {
    let filtered = activeTab === "全部" ? TOOLS : TOOLS.filter((tool) => tool.group === activeTab);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(tool => tool.name.toLowerCase().includes(q) || tool.desc.toLowerCase().includes(q));
    }
    return filtered;
  }, [activeTab, searchQuery]);

  const handleAddFile = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.showOpenDialog({
        properties: ["openFile", "multiSelections"],
        filters: [{ name: "PDF Files", extensions: ["pdf"] }],
      });
      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        const ext = filePath.toLowerCase().split('.').pop();
        if (ext === 'pdf') {
          const buffer = await window.electronAPI.readFile(filePath);
          const fileName = filePath.split('\\').pop().split('/').pop();
          const fileObj = new File([buffer], fileName, { type: "application/pdf" });
          navigate("/viewer", { state: { externalFile: fileObj, externalBuffer: buffer } });
        } else {
          navigate("/convert", { state: { externalFilePath: filePath } });
        }
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleWebFileInput = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      navigate("/viewer", { state: { externalFile: selectedFile } });
    }
  };

  return (
    <>
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-[#f7f8fb]/90 px-6 backdrop-blur-xl">
        <div>
          <div className="text-xl font-black tracking-tight">首页工作台</div>
          <div className="text-xs text-slate-500">拖拽文件开始处理，也可以从下方选择常用工具。</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden h-10 w-[300px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm lg:flex">
            <Icon name="search" size={17} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索工具..."
              className="flex-1 bg-transparent outline-none text-slate-700 placeholder-slate-400"
            />
          </div>
          <button type="button" onClick={handleAddFile} className="flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-600/20">
            <Icon name="plus" size={17} /> 添加文件
          </button>
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleWebFileInput} />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px] gap-5 overflow-hidden p-5">
        <section className="min-w-0 overflow-auto pr-1">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_300px]">
            <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 p-6 text-white shadow-2xl shadow-slate-900/15">
              <div className="absolute right-[-80px] top-[-80px] h-64 w-64 rounded-full bg-red-500/20 blur-3xl" />
              <div className="relative flex min-h-[260px] flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/75 ring-1 ring-white/15">
                    <Icon name="spark" size={15} /> 全民好用 PDF 桌面版
                  </div>
                  <h1 className="mt-5 max-w-xl text-4xl font-black leading-tight">复杂 PDF 操作，做成一个按钮的事。</h1>
                  <p className="mt-3 max-w-lg text-sm leading-6 text-white/65">支持转换、合并、拆分、压缩、加密、旋转、水印、重排、批量处理、提取图片、图片转换、页码页眉、文字提取、签名、对比。本地优先处理。</p>
                </div>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link to="/viewer" className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-slate-50 transition">选择 PDF 文件</Link>
                  <Link to="/history" className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-bold text-white ring-1 ring-white/15 hover:bg-white/20 transition">打开处理记录</Link>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border-2 border-dashed border-slate-300 bg-white/80 p-5 text-center shadow-sm">
              <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-[24px] bg-slate-50/80 p-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-600"><Icon name="upload" size={34} /></div>
                <div className="mt-5 text-lg font-black">准备开始处理</div>
                <p className="mt-2 text-sm leading-6 text-slate-500">点击下方按钮前往工作台选择本地文件进行操作。</p>
                <Link to="/viewer" className="mt-5 inline-block rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800">前往预览与处理</Link>
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

        <aside className="hidden min-h-0 flex-col gap-5 overflow-hidden xl:flex" style={{ width: 360 }}>
          {/* Quick actions */}
          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black">快速操作</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { icon: "merge", label: "合并 PDF", to: "/merge" },
                { icon: "scissors", label: "拆分 PDF", to: "/split" },
                { icon: "zap", label: "压缩 PDF", to: "/compress" },
                { icon: "lock", label: "加密 PDF", to: "/secure" },
              ].map((item) => (
                <Link key={item.label} to={item.to} className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-3 transition hover:border-red-200 hover:bg-red-50/50">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-100 group-hover:text-red-600">
                    <Icon name={item.icon} size={18} />
                  </div>
                  <span className="text-sm font-bold text-slate-700 group-hover:text-red-600">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black">使用提示</h2>
            <div className="mt-4 space-y-3">
              {[
                { icon: "zap", text: "所有操作均在本地完成，文件不会上传到云端" },
                { icon: "file", text: "支持拖拽文件到页面直接开始处理" },
                { icon: "search", text: "使用右上角搜索框快速查找工具" },
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-3 text-sm text-slate-600">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                    <Icon name={tip.icon} size={14} />
                  </div>
                  <span>{tip.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Task queue */}
          <div className="flex min-h-0 flex-1 flex-col rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black">任务队列</h2>
                <p className="mt-1 text-xs text-slate-500">当前处理进度</p>
              </div>
              {tasks.length > 0 && (
                <button onClick={() => clearTasks()} type="button" className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-600 transition">清空</button>
              )}
            </div>

            <div className="mt-4 flex-1 space-y-3 overflow-auto pr-1">
              {tasks.length > 0 ? tasks.slice(0, 5).map((task, index) => <TaskItem key={`${task.id || "task"}-${index}`} task={task} />) : (
                <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
                  <Icon name="file" size={32} />
                  <p className="mt-3 text-sm">暂无处理任务</p>
                  <p className="mt-1 text-xs">处理文件后将在此显示进度</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
