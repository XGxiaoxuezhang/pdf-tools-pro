import { PDFDocument, rgb, degrees } from 'pdf-lib';

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

/**
 * Rotate pages in a PDF.
 * @param {ArrayBuffer} fileBuffer
 * @param {number} angle - rotation angle (90, 180, 270)
 * @param {number[]|null} pageIndices - 0-based page indices, null for all pages
 * @returns {Uint8Array}
 */
export async function rotatePdf(fileBuffer, angle, pageIndices = null) {
  const pdf = await PDFDocument.load(fileBuffer);
  const pages = pdf.getPages();
  const targets = pageIndices || pages.map((_, i) => i);
  for (const idx of targets) {
    if (idx >= 0 && idx < pages.length) {
      const page = pages[idx];
      const current = page.getRotation().angle;
      page.setRotation(degrees(current + angle));
    }
  }
  return await pdf.save();
}

/**
 * Add text watermark to every page of a PDF.
 * @param {ArrayBuffer} fileBuffer
 * @param {object} opts - { text, fontSize, color, opacity, angle }
 * @returns {Uint8Array}
 */
export async function addWatermark(fileBuffer, opts) {
  const { text, fontSize = 48, color = '#999999', opacity = 0.3, angle = -45 } = opts;
  const pdf = await PDFDocument.load(fileBuffer);
  const pages = pdf.getPages();

  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  // Embed a standard font that supports basic ASCII
  const font = await pdf.embedFont('Helvetica');

  for (const page of pages) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = fontSize;

    // Center the watermark on the page
    const x = (width - textWidth * Math.cos(angle * Math.PI / 180)) / 2;
    const y = (height - textHeight) / 2;

    page.drawText(text, {
      x: width / 2 - textWidth / 2,
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(r, g, b),
      opacity,
      rotate: degrees(angle),
    });
  }

  return await pdf.save();
}

/**
 * Reorder pages in a PDF.
 * @param {ArrayBuffer} fileBuffer
 * @param {number[]} newOrder - 0-based page indices in new order
 * @returns {Uint8Array}
 */
export async function reorderPdf(fileBuffer, newOrder) {
  const src = await PDFDocument.load(fileBuffer);
  const dst = await PDFDocument.create();
  const copiedPages = await dst.copyPages(src, newOrder);
  copiedPages.forEach(page => dst.addPage(page));
  return await dst.save();
}
