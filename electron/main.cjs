const { app, BrowserWindow, ipcMain, dialog, shell, net } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const https = require('https');
const crypto = require('crypto');

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

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
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
} // end of single-instance else block

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

const fileExists = (filePath) => {
  try {
    return fsSync.existsSync(filePath);
  } catch {
    return false;
  }
};

const getEngineRoot = () => {
  if (process.env.NODE_ENV === 'development') {
    return path.join(__dirname, '../python_engine');
  }
  return path.join(process.resourcesPath, 'python_engine');
};

const getConverterCommand = () => {
  const engineRoot = getEngineRoot();
  const scriptPath = path.join(engineRoot, 'converter.py');
  const exePath = path.join(engineRoot, 'converter.exe');

  if (process.platform === 'win32' && fileExists(exePath)) {
    return { command: exePath, baseArgs: [], kind: 'bundled-exe' };
  }

  if (!fileExists(scriptPath)) {
    return {
      error: `未找到转换引擎脚本：${scriptPath}`,
    };
  }

  const configuredPython = process.env.PDF_TOOLS_PYTHON;
  const candidates = configuredPython
    ? [configuredPython]
    : (process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python']);

  return {
    command: candidates[0],
    fallbacks: candidates.slice(1),
    baseArgs: [scriptPath],
    kind: 'python-script',
  };
};

const spawnConverter = (engine, args) => {
  const candidates = [engine.command, ...(engine.fallbacks || [])];
  let lastError = null;

  for (const command of candidates) {
    try {
      const child = spawn(command, [...engine.baseArgs, ...args], { windowsHide: true });
      child.once('error', (err) => {
        lastError = err;
      });
      return { child, command };
    } catch (err) {
      lastError = err;
    }
  }

  return { error: lastError };
};

ipcMain.handle('convertDocument', async (event, mode, inputPath, outputPath, extraArg) => {
  if (mode === 'url2pdf') {
    return new Promise((resolve) => {
      let resolved = false;
      let win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });

      const cleanup = () => {
        if (!win.isDestroyed()) win.destroy();
      };

      win.webContents.on('did-fail-load', (_event, errorCode, errorDesc) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve({ status: 'error', message: `无法加载网页 (${errorCode}): ${errorDesc}` });
        }
      });

      // Timeout after 30 seconds
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve({ status: 'error', message: '网页加载超时，请检查网址或网络连接。' });
        }
      }, 30000);

      win.loadURL(inputPath.startsWith('http') ? inputPath : `https://${inputPath}`).then(() => {
        win.webContents.printToPDF({
          printBackground: true,
          landscape: false,
          pageSize: 'A4',
          preferCSSPageSize: true
        }).then(async (data) => {
          clearTimeout(timer);
          if (resolved) return;
          resolved = true;
          try {
            await fs.writeFile(outputPath, data);
            cleanup();
            resolve({ status: 'success', message: 'URL to PDF conversion successful.' });
          } catch (err) {
            cleanup();
            resolve({ status: 'error', message: err.message });
          }
        }).catch(err => {
          clearTimeout(timer);
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve({ status: 'error', message: err.message });
          }
        });
      }).catch(err => {
        clearTimeout(timer);
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve({ status: 'error', message: '无法加载网页，请检查网址。' });
        }
      });
    });
  }

  return new Promise((resolve) => {
    const engine = getConverterCommand();
    if (engine.error) {
      resolve({ status: 'error', message: engine.error });
      return;
    }

    const args = [mode, inputPath, outputPath];
    if (extraArg) args.push(extraArg);

    const spawned = spawnConverter(engine, args);
    if (spawned.error || !spawned.child) {
      resolve({
        status: 'error',
        message: '无法启动转换引擎。请安装 Python 3 并执行：pip install -r python_engine/requirements.txt',
        details: spawned.error?.message || '',
      });
      return;
    }

    const pythonProc = spawned.child;
    
    let outputData = '';
    let errorData = '';
    
    pythonProc.stdout.on('data', (data) => {
      outputData += data.toString();
    });
    
    pythonProc.stderr.on('data', (data) => {
      errorData += data.toString();
      console.error(`Converter Stderr: ${data}`);
    });

    pythonProc.on('error', (err) => {
      resolve({
        status: 'error',
        message: `无法启动转换引擎：${err.message}`,
        details: `engine=${engine.kind}`,
      });
    });
    
    pythonProc.on('close', (code) => {
      try {
        const result = JSON.parse(outputData);
        resolve(result);
      } catch {
        resolve({
          status: 'error',
          message: 'Failed to parse python output',
          details: outputData || errorData || `exit code ${code}`
        });
      }
    });
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

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('open-external', (event, url) => {
  shell.openExternal(url);
});

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

ipcMain.handle('check-for-updates', async () => {
  try {
    const currentVersion = app.getVersion();
    const res = await net.fetch('https://api.github.com/repos/XGxiaoxuezhang/pdf-tools-pro/releases/latest', {
      headers: { 'User-Agent': 'pdf-tools-pro' }
    });
    const data = await res.json();
    const latestVersion = (data.tag_name || '').replace('v', '');
    const downloadUrl = data.html_url || '';
    const body = data.body || '';
    return {
      currentVersion,
      latestVersion,
      downloadUrl,
      releaseNotes: body,
      hasUpdate: compareVersions(latestVersion, currentVersion) > 0
    };
  } catch (err) {
    return { currentVersion: app.getVersion(), error: err.message };
  }
});

let currentDownloadReq = null;

ipcMain.handle('update:download', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { success: false, error: '窗口不存在' };

  try {
    // Get release info
    const res = await net.fetch('https://api.github.com/repos/XGxiaoxuezhang/pdf-tools-pro/releases/latest', {
      headers: { 'User-Agent': 'pdf-tools-pro' }
    });
    const data = await res.json();
    const latestVersion = (data.tag_name || '').replace('v', '');
    const asset = (data.assets || []).find(a => a.name && a.name.endsWith('.exe'));
    if (!asset) return { success: false, error: '未找到安装包' };

    const downloadUrl = asset.browser_download_url;
    const fileName = asset.name;
    const savePath = path.join(os.tmpdir(), fileName);

    return await new Promise((resolve) => {
      const doRequest = (url, redirects = 0) => {
        if (redirects > 5) {
          resolve({ success: false, error: '重定向次数过多' });
          return;
        }

        const req = https.get(url, { headers: { 'User-Agent': 'pdf-tools-pro' } }, (res) => {
          // Handle redirect
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            doRequest(res.headers.location, redirects + 1);
            return;
          }

          if (res.statusCode !== 200) {
            resolve({ success: false, error: `下载失败: HTTP ${res.statusCode}` });
            return;
          }

          const total = parseInt(res.headers['content-length'] || '0', 10);
          let downloaded = 0;
          const fileStream = fsSync.createWriteStream(savePath);

          res.on('data', (chunk) => {
            downloaded += chunk.length;
            const percent = total > 0 ? Math.round((downloaded / total) * 100) : 0;
            win.webContents.send('update:download-progress', {
              percent,
              downloaded,
              total,
              version: latestVersion,
            });
          });

          res.pipe(fileStream);

          fileStream.on('finish', () => {
            fileStream.close();
            currentDownloadReq = null;
            resolve({ success: true, filePath: savePath, version: latestVersion });
          });

          fileStream.on('error', (err) => {
            currentDownloadReq = null;
            try { fsSync.unlinkSync(savePath); } catch (_) {}
            resolve({ success: false, error: err.message });
          });
        });

        req.on('error', (err) => {
          currentDownloadReq = null;
          if (err.code === 'ECONNRESET') {
            resolve({ success: false, error: '下载已取消' });
          } else {
            resolve({ success: false, error: err.message });
          }
        });

        currentDownloadReq = req;
      };

      doRequest(downloadUrl);
    });
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('update:cancel-download', () => {
  if (currentDownloadReq) {
    currentDownloadReq.destroy();
    currentDownloadReq = null;
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('update:install', async (event, installerPath) => {
  try {
    await shell.openPath(installerPath);
    app.quit();
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ---- 会员激活 ----

const ACTIVATION_FILE = path.join(app.getPath('userData'), 'activation.json');
const CF_WORKER_URL = 'https://pdfactive.030924.xyz';

function getMachineId() {
  const interfaces = os.networkInterfaces();
  let mac = '';
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
        mac = iface.mac;
        break;
      }
    }
    if (mac) break;
  }
  const raw = mac + '|' + os.hostname() + '|' + os.platform() + '|' + os.arch();
  return crypto.createHash('sha256').update(raw).digest('hex');
}

ipcMain.handle('get-machine-id', () => {
  return getMachineId();
});

ipcMain.handle('check-activation', async () => {
  try {
    if (!fsSync.existsSync(ACTIVATION_FILE)) return { activated: false };
    const data = JSON.parse(fsSync.readFileSync(ACTIVATION_FILE, 'utf-8'));
    const currentMachineId = getMachineId();
    if (!data.machineId || !data.code || data.machineId !== currentMachineId) {
      return { activated: false };
    }

    // Always verify with server to check revocation
    try {
      const body = JSON.stringify({ machineId: currentMachineId, code: data.code });
      const result = await new Promise((resolve, reject) => {
        const url = new URL(`${CF_WORKER_URL}/api/check-activation`);
        const req = https.request({
          hostname: url.hostname, port: 443, path: url.pathname, method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'User-Agent': 'pdf-tools-pro' },
        }, (res) => {
          let d = ''; res.on('data', c => d += c);
          res.on('end', () => { try { resolve(JSON.parse(d)); } catch { reject(new Error('parse error')); } });
        });
        req.on('error', reject); req.write(body); req.end();
      });

      if (result.revoked) {
        // Clear local activation
        try { fsSync.unlinkSync(ACTIVATION_FILE); } catch (_) {}
        return { activated: false, revoked: true };
      }
      return { activated: result.activated, activatedAt: data.activatedAt };
    } catch {
      // Offline: trust local file if it was previously verified
      if (data.verified) return { activated: true, activatedAt: data.activatedAt };
      return { activated: false };
    }
  } catch {
    return { activated: false };
  }
});

ipcMain.handle('activate', async (event, code) => {
  try {
    const machineId = getMachineId();
    const body = JSON.stringify({ machineId, code });

    const result = await new Promise((resolve, reject) => {
      const url = new URL(`${CF_WORKER_URL}/api/activate`);
      const req = https.request({
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'User-Agent': 'pdf-tools-pro',
        },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch { reject(new Error('响应解析失败')); }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });

    if (result.success) {
      const activationData = {
        machineId,
        code,
        verified: true,
        activatedAt: new Date().toISOString(),
      };
      fsSync.writeFileSync(ACTIVATION_FILE, JSON.stringify(activationData, null, 2));
      return { success: true, message: '激活成功' };
    }
    return { success: false, message: result.message || '激活码无效' };
  } catch (err) {
    return { success: false, message: '网络错误：' + err.message };
  }
});

