import React, { useState, useEffect } from "react";
import Icon from "../components/Icon";
import { getTasks, clearTasks as storeClearTasks } from "../lib/taskStore";

export default function TaskHistory() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const loadTasks = () => setTasks(getTasks());
    loadTasks();
    
    window.addEventListener("tasks_updated", loadTasks);
    return () => window.removeEventListener("tasks_updated", loadTasks);
  }, []);

  const clearHistory = () => {
    if (window.confirm("确定要清空所有处理记录吗？（不会删除您的实际文件）")) {
      storeClearTasks();
    }
  };

  return (
    <div className="flex h-full flex-col p-6 overflow-auto">
      <div className="mb-6 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900">任务记录</h1>
          <p className="mt-1 text-sm text-slate-500">查看最近的本地文件处理历史（为了您的隐私，记录仅保存在本机）。</p>
        </div>
        <button 
          onClick={clearHistory}
          disabled={tasks.length === 0}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition ${tasks.length === 0 ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-white text-slate-700 border border-slate-200 hover:text-red-600 hover:bg-red-50 hover:border-red-200"}`}
        >
          <Icon name="trash" size={16} /> 清空记录
        </button>
      </div>

      <div className="flex-1 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm overflow-hidden flex flex-col">
        {tasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-50 mb-4">
              <Icon name="history" size={48} />
            </div>
            <h3 className="text-lg font-bold text-slate-600 mb-2">暂无任务记录</h3>
            <p className="text-sm">您处理的文件历史将会显示在这里。</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto pr-2 space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="group flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-md hover:border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600">
                    <Icon name="file" size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">{task.file}</h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span className="font-medium text-slate-700 bg-slate-200/50 px-2 py-0.5 rounded-md">{task.action}</span>
                      <span>{task.size}</span>
                      <span>{task.date}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className="rounded-full px-3 py-1 text-xs font-bold text-green-700 bg-green-100 flex items-center gap-1">
                    <Icon name="check" size={14} /> {task.status}
                  </span>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-slate-400 hover:text-slate-900 tooltip" title="在文件夹中显示">
                    <Icon name="folder" size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
