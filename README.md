<div align="center">
  <img src="public/logo.png" alt="全民好用PDF Logo" width="120" />
  <h1>全民好用 PDF (PDF Tools Pro)</h1>
  <p><b>您桌面上的终极离线 PDF 生产力利器</b></p>

  <p>
    <img src="https://img.shields.io/badge/Platform-Windows_10%20%7C%2011-blue.svg" alt="Platform">
    <img src="https://img.shields.io/badge/Framework-Electron%20%7C%20React-61dafb.svg" alt="Framework">
    <img src="https://img.shields.io/badge/Engine-Python_3.14-FFD43B.svg" alt="Engine">
    <img src="https://img.shields.io/badge/License-MIT-success.svg" alt="License">
  </p>
</div>

---

## 🌟 简介

**全民好用 PDF** 是一款专注于 **极致纯净、极致隐私、极速本地化处理** 的现代化桌面 PDF 工具箱。

市面上大多数好用的 PDF 转换软件要么收费高昂，要么需要把涉及隐私的合同、证件等敏感文件上传到云端处理。本作由此诞生 —— **完全开源、永远免费、100% 断网离线运行**。它的核心计算引擎运行在您本地机器上，极大保障了您的数据隐私与安全。

## ✨ 核心特性

- 🔒 **全盘本地离线处理**：无需联网，不上传任何字节，安全私密。
- ⚡ **无缝系统级集成**：
  - 支持设为 **PDF 默认打开方式**，双击秒开。
  - 自动挂载 Windows 右键菜单：**“在 全民好用PDF 中打开”**。
  - **单例模式护航**，防误触无限多开。
- 🔄 **全能格式互转**：支持 Word / Excel / PPT / TXT / URL 与 PDF 的高质量双向转换（完美保留书签与目录导航）。
- ✂️ **深度页面处理**：自定义多文件自由合并、精准指定页码拆分与提取。
- 🗜️ **极速无损瘦身**：基于底层算法的 PDF 智能压缩，多档位自适应瘦身。
- 🛡️ **安全加解密中心**：提供极其强悍的 **AES-256 级别** PDF 密码锁定与极限解除限制功能。
- 🎨 **现代化次世代 UI**：采用 React + TailwindCSS 构建，原生无边框沉浸式暗黑/亮色搭配设计，丝滑流畅的交互体验。

## 📸 界面预览

*(你可以将软件的截图放到项目中并在这里展示，例如主界面、处理界面等)*

## 🚀 下载与安装

进入本仓库的 **[Releases 页面](../../releases)**，下载最新版的 `全民好用pdf Setup 1.0.0.exe`。
双击安装后，直接享受丝滑体验。

> **注意**：由于本软件为个人开源构建，暂未购买微软的数字签名证书。安装时如遇 Windows Defender 拦截，请点击“更多信息” -> “仍要运行”。

## 🛠️ 技术架构

本项目采用了行业领先的**前后端分离混合架构**：

- **渲染层 (UI)**：`React 19` + `Vite` + `Tailwind CSS`，配合 `lucide-react` 提供精致图标体系。
- **主进程 (Electron)**：处理系统事件拦截、文件右键菜单关联、托盘通信、与 Python 引擎的异步 IPC 通讯。
- **核动力引擎 (Python)**：
  - `PyMuPDF (fitz)`：负责所有高强度的 PDF 渲染、压缩、加解密逻辑。
  - `pdf2docx` & `pywin32`：负责与系统底层的 Office 接口进行无损转换。
  - **PyInstaller 脱壳封装**：将庞大的 Python 引擎打包成了独立免依赖的 `converter.exe`。因此，用户的电脑上**完全不需要安装任何 Python 环境**即可开箱即用。

## 💻 本地开发指南

如果您希望参与开发或者自行编译本软件，请按以下步骤操作：

### 环境要求
- Node.js (v18+)
- Python (3.10+) 

### 1. 克隆代码库
```bash
git clone https://github.com/XGxiaoxuezhang/pdf-tools-pro.git
cd pdf-tools-pro
```

### 2. 安装前端依赖
```bash
npm install
```

### 3. 配置后端 Python 引擎
```bash
cd python_engine
pip install -r requirements.txt
```

### 4. 启动开发环境
```bash
# 回到项目根目录
cd ..
# 启动 Vite 热更新服务器与 Electron 窗口
npm run dev
```

### 5. 独立打包发行 (构建 .exe)
```bash
# 第一步：打包 Python 引擎为独立的 exe
cd python_engine
pyinstaller converter.spec

# 第二步：将前端编译并封装为安装包
cd ..
npm run build
```
执行完毕后，您可以在 `dist-electron/` 目录中找到您的专属安装包！

## 🤝 致谢与开源说明

本软件的诞生离不开开源社区的伟大贡献。

**License**: [MIT License](LICENSE)
