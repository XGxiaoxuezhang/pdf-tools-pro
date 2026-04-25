import { PDFDocument } from 'pdf-lib';

/**
 * Merge multiple PDFs.
 * @param {ArrayBuffer[]} fileBuffers Array of ArrayBuffers for each PDF file
 * @returns {Uint8Array} The merged PDF as a Uint8Array
 */
export async function mergePdfs(fileBuffers) {
  const mergedPdf = await PDFDocument.create();

  for (const buffer of fileBuffers) {
    const pdf = await PDFDocument.load(buffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return await mergedPdf.save();
}
