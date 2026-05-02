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
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  cancelDownload: () => ipcRenderer.invoke('update:cancel-download'),
  installUpdate: (filePath) => ipcRenderer.invoke('update:install', filePath),
  onUpdateProgress: (callback) => ipcRenderer.on('update:download-progress', (_event, data) => callback(data)),
  removeUpdateProgressListener: () => ipcRenderer.removeAllListeners('update:download-progress'),
  // 会员激活
  getMachineId: () => ipcRenderer.invoke('get-machine-id'),
  checkActivation: () => ipcRenderer.invoke('check-activation'),
  activate: (code) => ipcRenderer.invoke('activate', code),
});
