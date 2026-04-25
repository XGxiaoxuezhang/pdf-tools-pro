import React, { useState } from "react";
import Icon from "../components/Icon";
import { addTask } from "../lib/taskStore";

export default function PdfSecure() {
  const [file, setFile] = useState(null);
  const [filePath, setFilePath] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("encrypt"); // "encrypt", "decrypt"
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSelectFiles = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.showOpenDialog({
        properties: ["openFile"],
        filters: [{ name: "PDF Files", extensions: ["pdf"] }],
      });
      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        setFilePath(result.filePaths[0]);
        const name = result.filePaths[0].split('\\').pop().split('/').pop();
        setFile({ name: name, size: 0 }); 
      }
    }
  };

  const executeSecurity = async () => {
    if (!filePath) return alert("请先选择 PDF 文件！");
    if (!password.trim()) return alert("请输入密码！");
    setIsProcessing(true);
    
    try {
      if (window.electronAPI) {
        const defaultName = file ? file.name.replace(/\.[^/.]+$/, "") + (mode === "encrypt" ? "_已加密.pdf" : "_已解密.pdf") : "安全处理结果.pdf";
        
        const { canceled, filePath: savePath } = await window.electronAPI.showSaveDialog({
          title: mode === "encrypt" ? "保存加密后的文件" : "保存解密后的文件",
          defaultPath: defaultName,
          filters: [{ name: "PDF Files", extensions: ["pdf"] }]
        });
        
        if (!canceled && savePath) {
          // Pass password as the 5th argument (extraArg)
          const res = await window.electronAPI.convertDocument(mode, filePath, savePath, password);
          if (res.status === "success") {
            alert(mode === "encrypt" ? "加锁成功！文件已保存。" : "解锁成功！密码已被永久移除。");
            addTask({ file: file.name, action: mode === "encrypt" ? "添加密码" : "永久解锁", size: `${(file.size / 1024 / 1024).toFixed(2)} MB`, progress: 100, status: "已完成" });
            setFile(null);
            setFilePath("");
            setPassword("");
          } else {
            alert((mode === "encrypt" ? "加密失败：" : "解密失败：") + res.message);
          }
        }
      }
    } catch (err) {
      console.error(err);
      alert("安全处理过程中发生错误。");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-full flex-col p-6 overflow-auto">
      <div className="mb-6 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900">PDF 安全中心</h1>
          <p className="mt-1 text-sm text-slate-500">采用最高级别的 AES-256 为文档上锁，或移除已知密码。</p>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-[500px]">
        <div className="flex-1 flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm overflow-auto">
          <div className="mb-6">
            <h3 className="font-bold text-slate-900 text-lg mb-4">选择操作模式</h3>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => { setMode("encrypt"); setFile(null); setFilePath(""); setPassword(""); }} className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition ${mode === "encrypt" ? "border-red-600 bg-red-50 text-red-600" : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"}`}>
                <Icon name="lock" size={32} className="mb-2" />
                <span className="font-bold">加密文档</span>
                <span className="text-xs mt-1 opacity-70">添加打开密码限制</span>
              </button>
              <button onClick={() => { setMode("decrypt"); setFile(null); setFilePath(""); setPassword(""); }} className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition ${mode === "decrypt" ? "border-red-600 bg-red-50 text-red-600" : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"}`}>
                <Icon name="unlock" size={32} className="mb-2" />
                <span className="font-bold">解密文档</span>
                <span className="text-xs mt-1 opacity-70">永久移除已知密码</span>
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/50 p-6 items-center justify-center text-center transition hover:border-red-400">
            {!file ? (
              <>
                <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-white mb-4 shadow-sm ${mode === "encrypt" ? "text-slate-400" : "text-yellow-500"}`}>
                  <Icon name={mode === "encrypt" ? "upload" : "lock"} size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  选择要 {mode === "encrypt" ? "加密" : "解密"} 的 PDF 文件
                </h3>
                <button 
                  onClick={handleSelectFiles}
                  className="mt-6 rounded-2xl bg-slate-900 px-6 py-3 font-bold text-white shadow-lg transition hover:bg-slate-800"
                >
                  浏览本地文件
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-50 text-red-600 mb-4 relative">
                  <Icon name="file" size={40} />
                  {mode === "decrypt" && (
                    <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-white rounded-full p-1 border-2 border-white">
                      <Icon name="lock" size={12} />
                    </div>
                  )}
                </div>
                <div className="font-bold text-slate-900 text-lg">{file.name}</div>
                <div className="text-sm text-slate-500 mt-1 max-w-sm truncate" title={filePath}>{filePath}</div>
                
                <button 
                  onClick={() => { setFile(null); setFilePath(""); }}
                  className="mt-4 text-sm font-bold text-slate-400 hover:text-red-600"
                >
                  移除并重新选择
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="w-[300px] shrink-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-900 text-lg">{mode === "encrypt" ? "设置新密码" : "输入原密码"}</h3>
          <div className="mt-6 flex-1 text-sm text-slate-600 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">
                {mode === "encrypt" ? "此密码将用于打开文件" : "输入此文件当前的打开密码"}
              </label>
              <input 
                type="text" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="在此输入密码"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-slate-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>
            
            {mode === "encrypt" ? (
              <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100 mt-4">
                <div className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                  <Icon name="shield" size={16} /> AES-256 加密
                </div>
                <p className="text-orange-700 text-xs leading-5">
                  一旦加上密码，如果没有密码任何人（包括本软件）都无法打开此文档，请务必妥善保管密码。
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-green-50 border border-green-100 mt-4">
                <div className="font-bold text-green-800 mb-2 flex items-center gap-2">
                  <Icon name="unlock" size={16} /> 永久解锁
                </div>
                <p className="text-green-700 text-xs leading-5">
                  本功能需要您已知该文档的原密码。解密后输出的文件将永久移除密码保护，方便日常查阅。
                </p>
              </div>
            )}
            
            {isProcessing && (
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex flex-col items-center text-center mt-4">
                <div className="animate-spin mb-3 text-blue-600">
                  <Icon name="settings" size={24} />
                </div>
                <div className="font-bold text-blue-800">安全处理中...</div>
              </div>
            )}
          </div>
          <button 
            onClick={executeSecurity} 
            disabled={!filePath || !password.trim() || isProcessing}
            className={`mt-auto w-full rounded-2xl px-4 py-4 font-bold text-white shadow-lg transition ${!filePath || !password.trim() || isProcessing ? "bg-slate-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 hover:shadow-red-600/20"}`}
          >
            {isProcessing ? "处理中..." : (mode === "encrypt" ? "加锁并保存" : "验证密码并永久解锁")}
          </button>
        </div>
      </div>
    </div>
  );
}
