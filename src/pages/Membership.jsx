import React, { useState, useEffect } from "react";
import Icon from "../components/Icon";
import { useActivation } from "../lib/featureGate";

export default function Membership() {
  const { isActivated, isLoading, refresh } = useActivation();
  const [machineId, setMachineId] = useState("");
  const [code, setCode] = useState("");
  const [activating, setActivating] = useState(false);
  const [message, setMessage] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (window.electronAPI?.getMachineId) {
      window.electronAPI.getMachineId().then(id => {
        if (id) setMachineId(id);
      });
    }
  }, []);

  const handleActivate = async () => {
    if (!code.trim()) return;
    setActivating(true);
    setMessage(null);
    try {
      const result = await window.electronAPI.activate(code.trim());
      if (result.success) {
        setMessage({ type: "success", text: result.message });
        refresh();
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch {
      setMessage({ type: "error", text: "激活失败，请重试" });
    } finally {
      setActivating(false);
    }
  };

  const copyMachineId = () => {
    if (machineId) {
      navigator.clipboard.writeText(machineId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const premiumFeatures = [
    { name: "PDF 水印", desc: "为 PDF 添加文字水印" },
    { name: "PDF 签名", desc: "手写签名或图片签名" },
    { name: "PDF 对比", desc: "对比两个 PDF 文档差异" },
    { name: "批量处理", desc: "批量合并、拆分、转换" },
    { name: "提取图片", desc: "从 PDF 批量导出图片" },
    { name: "图片转换", desc: "PNG/JPG/WebP 格式互转" },
    { name: "文字提取", desc: "提取 PDF 中的文字内容" },
    { name: "页面重排", desc: "拖拽调整页面顺序" },
    { name: "文档转换", desc: "PDF 与 Office 格式互转" },
  ];

  return (
    <div className="flex h-full flex-col p-6 overflow-auto">
      <div className="mb-6 shrink-0">
        <h1 className="text-2xl font-black text-slate-900">会员中心</h1>
        <p className="mt-1 text-sm text-slate-500">激活会员，解锁全部高级功能。</p>
      </div>

      <div className="flex flex-1 gap-6 min-h-[400px]">
        <div className="flex-1 flex flex-col rounded-3xl border border-slate-200 bg-white p-8 shadow-sm overflow-auto">

          {/* 状态卡片 */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-red-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : isActivated ? (
            <div className="rounded-2xl bg-green-50 border border-green-200 p-8 text-center mb-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 mx-auto mb-4">
                <Icon name="check" size={32} />
              </div>
              <h2 className="text-2xl font-black text-green-800">已激活会员</h2>
              <p className="mt-2 text-sm text-green-600">全部高级功能已解锁，感谢您的支持！</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-orange-50 border border-orange-200 p-8 text-center mb-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-orange-600 mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-orange-800">未激活</h2>
              <p className="mt-2 text-sm text-orange-600">请按下方步骤获取激活码</p>
            </div>
          )}

          {/* 机器码 */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-700 mb-2">您的机器码</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={machineId}
                readOnly
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs text-slate-700 outline-none"
              />
              <button
                onClick={copyMachineId}
                className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 transition shrink-0"
              >
                {copied ? "已复制" : "复制"}
              </button>
            </div>
          </div>

          {/* 激活码输入 */}
          {!isActivated && (
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">输入激活码</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="请输入激活码"
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleActivate(); }}
                />
                <button
                  onClick={handleActivate}
                  disabled={!code.trim() || activating}
                  className={`rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg transition shrink-0 ${!code.trim() || activating ? "bg-slate-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 hover:shadow-red-600/20"}`}
                >
                  {activating ? "激活中..." : "激活"}
                </button>
              </div>
              {message && (
                <p className={`mt-2 text-sm font-bold ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
                  {message.text}
                </p>
              )}
            </div>
          )}

          {/* 开通会员指引 */}
          {!isActivated && (
            <div className="mb-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6">
              <h3 className="font-bold text-slate-900 text-lg mb-4">开通会员步骤</h3>
              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-white text-xs font-bold">1</span>
                  <span>点击上方「复制」按钮，复制您的机器码</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-white text-xs font-bold">2</span>
                  <span>扫描下方赞赏码进行付款（金额随意）</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-white text-xs font-bold">3</span>
                  <span>将<strong>赞赏截图</strong>和<strong>机器码</strong>发送至邮箱：</span>
                </div>
                <div className="ml-9">
                  <a href="mailto:2684779302@qq.com" className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-blue-700 font-bold hover:bg-blue-100 transition">
                    <Icon name="user" size={16} />
                    2684779302@qq.com
                  </a>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-white text-xs font-bold">4</span>
                  <span>收到激活码后，粘贴到上方输入框，点击「激活」即可</span>
                </div>
              </div>

              {/* 赞赏二维码 */}
              <div className="mt-6 flex items-center justify-center gap-8">
                <div className="text-center">
                  <img src="./wechat-pay.png" alt="微信赞赏码" className="w-40 h-40 rounded-xl shadow-md object-contain bg-white" />
                  <p className="mt-2 text-xs text-slate-500 font-bold">微信赞赏</p>
                </div>
                <div className="text-center">
                  <img src="./alipay-pay.jpg" alt="支付宝赞赏码" className="w-40 h-40 rounded-xl shadow-md object-contain bg-white" />
                  <p className="mt-2 text-xs text-slate-500 font-bold">支付宝赞赏</p>
                </div>
              </div>
            </div>
          )}

          {/* 高级功能列表 */}
          <div className="mt-auto">
            <h3 className="font-bold text-slate-900 text-lg mb-4 flex items-center gap-2">
              <Icon name="star" size={20} /> 会员专属功能
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {premiumFeatures.map(f => (
                <div key={f.name} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center gap-2">
                    {isActivated ? (
                      <Icon name="check" size={14} className="text-green-500" />
                    ) : (
                      <Icon name="lock" size={14} className="text-slate-400" />
                    )}
                    <span className="font-bold text-sm text-slate-800">{f.name}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
