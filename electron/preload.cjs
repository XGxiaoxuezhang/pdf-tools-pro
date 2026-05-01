const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  windowAction: (action) => ipcRenderer.send('window-action', action),
  showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpenDialog', options),
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:showSaveDialog', options),
  saveFile: (filePath, data) => ipcRenderer.invoke('fs:saveFile', filePath, data),
  convertDocument: (mode, inputPath, outputPath, extraArg) => ipcRenderer.invoke('convertDocument', mode, inputPath, outputPath, extraArg),
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  onOpenExternalFile: (callback) => ipcRenderer.on('open-external-file', (_event, filePath) => callback(filePath)),
  removeOpenExternalFileListener: (callback) => ipcRenderer.removeAllListeners('open-external-file'),
  printPdf: (pdfDataArray, options) => ipcRenderer.invoke('print:pdf', pdfDataArray, options),
});
