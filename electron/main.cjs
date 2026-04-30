const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const os = require('os');
const { spawn } = require('child_process');

// Removed squirrel startup as we use electron-builder

let mainWindow;
let startupFilePath = null;

const processFileArg = (args) => {
  if (args.length >= 2) {
    const filePath = args[args.length - 1];
    if (filePath && !filePath.startsWith('-') && path.isAbsolute(filePath)) {
      return filePath;
    }
  }
  return null;
};

// We remove single instance lock because it interferes with development/restarts.
// app.on('second-instance') logic is still valid if we re-enable it later.
app.on('second-instance', (event, commandLine, workingDirectory) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    const filePath = processFileArg(commandLine);
    if (filePath) {
      mainWindow.webContents.send('open-external-file', filePath);
    }
  }
});

app.whenReady().then(() => {
  startupFilePath = processFileArg(process.argv);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    frame: false, // frameless for custom title bar
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
  
  mainWindow.webContents.on('did-finish-load', () => {
    if (startupFilePath) {
      mainWindow.webContents.send('open-external-file', startupFilePath);
      startupFilePath = null; // process only once
    }
  });
};

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC listeners for window actions
ipcMain.on('window-action', (event, action) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;

  switch (action) {
    case 'min':
    case 'minimize':
      win.minimize();
      break;
    case 'max':
    case 'maximize':
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
      break;
    case 'close':
      win.close();
      break;
  }
});

ipcMain.handle('dialog:showOpenDialog', async (event, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return await dialog.showOpenDialog(win, options);
});

ipcMain.handle('dialog:showSaveDialog', async (event, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return await dialog.showSaveDialog(win, options);
});

ipcMain.handle('fs:saveFile', async (event, filePath, data) => {
  try {
    await fs.writeFile(filePath, Buffer.from(data));
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:readFile', async (event, filePath) => {
  try {
    const data = await fs.readFile(filePath);
    return data;
  } catch (err) {
    throw err;
  }
});

ipcMain.handle('convertDocument', async (event, mode, inputPath, outputPath, extraArg) => {
  if (mode === 'url2pdf') {
    return new Promise((resolve) => {
      let win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
      win.loadURL(inputPath.startsWith('http') ? inputPath : `https://${inputPath}`).then(() => {
        win.webContents.printToPDF({
          printBackground: true,
          landscape: false,
          pageSize: 'A4',
          preferCSSPageSize: true
        }).then(data => {
          fs.writeFile(outputPath, data).then(() => {
            win.destroy();
            resolve({ status: 'success', message: 'URL to PDF conversion successful.' });
          }).catch(err => {
            win.destroy();
            resolve({ status: 'error', message: err.message });
          });
        }).catch(err => {
          win.destroy();
          resolve({ status: 'error', message: err.message });
        });
      }).catch(err => {
        win.destroy();
        resolve({ status: 'error', message: '无法加载网页，请检查网址。' });
      });
    });
  }

  return new Promise((resolve) => {
    // Determine path to python executable or script
    const isDev = process.env.NODE_ENV === 'development';
    
    let pythonProc;
    if (isDev) {
      const scriptPath = path.join(__dirname, '../python_engine/converter.py');
      const args = [scriptPath, mode, inputPath, outputPath];
      if (extraArg) args.push(extraArg);
      pythonProc = spawn('python', args);
    } else {
      const exePath = path.join(process.resourcesPath, 'python_engine/converter.exe');
      const args = [mode, inputPath, outputPath];
      if (extraArg) args.push(extraArg);
      pythonProc = spawn(exePath, args);
    }
    
    let outputData = '';
    
    pythonProc.stdout.on('data', (data) => {
      outputData += data.toString();
    });
    
    pythonProc.stderr.on('data', (data) => {
      console.error(`Python Stderr: ${data}`);
    });
    
    pythonProc.on('close', (code) => {
      try {
        const result = JSON.parse(outputData);
        resolve(result);
      } catch (err) {
        resolve({
          status: 'error',
          message: 'Failed to parse python output',
          details: outputData
        });
      }
    });
  });
ipcMain.handle('print:pdf', async (event, pdfDataArray, options = {}) => {
  // Write the PDF bytes to a temp file
  const tmpPath = path.join(os.tmpdir(), `pdf_print_${Date.now()}.pdf`);
  try {
    await fs.writeFile(tmpPath, Buffer.from(pdfDataArray));

    return await new Promise((resolve) => {
      // Open a hidden BrowserWindow that loads the PDF and prints it
      const printWin = new BrowserWindow({
        show: false,
        webPreferences: {
          plugins: true,
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      printWin.loadURL(`file://${tmpPath}`);

      printWin.webContents.on('did-finish-load', () => {
        printWin.webContents.print(
          {
            silent: options.silent || false,      // false = show print dialog
            printBackground: true,
            deviceName: options.deviceName || '',
          },
          (success, reason) => {
            printWin.destroy();
            try { fsSync.unlinkSync(tmpPath); } catch (_) {}
            if (success) {
              resolve({ success: true });
            } else {
              resolve({ success: false, reason });
            }
          }
        );
      });

      printWin.webContents.on('did-fail-load', () => {
        printWin.destroy();
        try { fsSync.unlinkSync(tmpPath); } catch (_) {}
        resolve({ success: false, reason: 'failed-to-load-pdf' });
      });
    });
  } catch (err) {
    return { success: false, reason: err.message };
  }
});

