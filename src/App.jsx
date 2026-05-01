import React, { useEffect } from "react";
import { HashRouter, Routes, Route, useNavigate } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import PdfMerge from "./pages/PdfMerge";
import PdfSplit from "./pages/PdfSplit";
import PdfViewer from "./pages/PdfViewer";
import PdfConvert from "./pages/PdfConvert";
import PdfCompress from "./pages/PdfCompress";
import PdfSecure from "./pages/PdfSecure";
import PdfRotate from "./pages/PdfRotate";
import PdfWatermark from "./pages/PdfWatermark";
import PdfReorder from "./pages/PdfReorder";
import PdfBatch from "./pages/PdfBatch";
import TaskHistory from "./pages/TaskHistory";
import About from "./pages/About";

function PlaceholderPage({ title }) {
  return (
    <div className="flex h-full items-center justify-center p-6 text-slate-500">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        <p className="mt-2">正在开发中，敬请期待...</p>
      </div>
    </div>
  );
}

function ExternalFileListener() {
  const navigate = useNavigate();
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onOpenExternalFile) {
      const handler = async (filePath) => {
        try {
          const ext = filePath.toLowerCase().split('.').pop();
          if (ext === 'pdf') {
            const buffer = await window.electronAPI.readFile(filePath);
            const fileName = filePath.split('\\').pop() || filePath.split('/').pop();
            const fileObj = new File([buffer], fileName, { type: "application/pdf" });
            navigate("/viewer", { state: { externalFile: fileObj, externalBuffer: buffer } });
          } else {
            navigate("/convert", { state: { externalFilePath: filePath } });
          }
        } catch (err) {
          console.error("Failed to load external file", err);
        }
      };
      window.electronAPI.onOpenExternalFile(handler);
      return () => {
        if (window.electronAPI.removeOpenExternalFileListener) {
          window.electronAPI.removeOpenExternalFileListener(handler);
        }
      };
    }
  }, [navigate]);
  return null;
}

export default function App() {
  return (
    <HashRouter>
      <Layout>
        <ExternalFileListener />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/merge" element={<PdfMerge />} />
          <Route path="/split" element={<PdfSplit />} />
          <Route path="/viewer" element={<PdfViewer />} />
          <Route path="/compress" element={<PdfCompress />} />
          <Route path="/convert" element={<PdfConvert />} />
          <Route path="/secure" element={<PdfSecure />} />
          <Route path="/rotate" element={<PdfRotate />} />
          <Route path="/watermark" element={<PdfWatermark />} />
          <Route path="/reorder" element={<PdfReorder />} />
          <Route path="/batch" element={<PdfBatch />} />
          <Route path="/history" element={<TaskHistory />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}
