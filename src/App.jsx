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
import PdfExtractImages from "./pages/PdfExtractImages";
import ImageConvert from "./pages/ImageConvert";
import PdfPageNumber from "./pages/PdfPageNumber";
import PdfTextExtract from "./pages/PdfTextExtract";
import PdfSign from "./pages/PdfSign";
import PdfCompare from "./pages/PdfCompare";
import TaskHistory from "./pages/TaskHistory";
import About from "./pages/About";
import Membership from "./pages/Membership";
import { ActivationProvider } from "./lib/featureGate";

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
      <ActivationProvider>
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
            <Route path="/extract-images" element={<PdfExtractImages />} />
            <Route path="/image-convert" element={<ImageConvert />} />
            <Route path="/page-number" element={<PdfPageNumber />} />
            <Route path="/text-extract" element={<PdfTextExtract />} />
            <Route path="/sign" element={<PdfSign />} />
            <Route path="/compare" element={<PdfCompare />} />
            <Route path="/history" element={<TaskHistory />} />
            <Route path="/membership" element={<Membership />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </Layout>
      </ActivationProvider>
    </HashRouter>
  );
}
