const { app, BrowserWindow, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const isDev = !app.isPackaged;
const { fork } = require("child_process");
const http = require("http");
const { autoUpdater } = require("electron-updater");

// ─── Logging ─────────────────────────────────────────────────────────────────
function writeLog(message) {
  try {
    const installDir = isDev ? process.cwd() : path.dirname(process.execPath);
    const logPath = path.join(installDir, "netiflow.log");
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`, "utf8");
  } catch (err) {
    console.error("Failed to write to log:", err);
  }
}

let mainWindow;
let loadingWindow;
let nextProcess;
let isQuitting = false;

// ─── Splash / Loading Window ──────────────────────────────────────────────────
function createLoadingWindow() {
  loadingWindow = new BrowserWindow({
    width: 420,
    height: 300,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: false,
    skipTaskbar: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
    icon: path.join(__dirname, "public/img/icon.png"),
  });

  // Load logo as base64 so it works in the data: URL context
  let logoBase64 = "";
  try {
    const logoPath = path.join(__dirname, "public/img/logo.png");
    logoBase64 = fs.readFileSync(logoPath).toString("base64");
  } catch (_) {}

  const logoSrc = logoBase64
    ? `data:image/png;base64,${logoBase64}`
    : "";

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', sans-serif;
    background: #f0f0f0;
    border-radius: 16px;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #1a1a1a;
    border: 1px solid #d8d8d8;
    overflow: hidden;
    user-select: none;
    -webkit-app-region: drag;
  }
  .logo-img {
    width: 88px;
    height: 88px;
    object-fit: contain;
    margin-bottom: 16px;
    filter: drop-shadow(0 2px 10px rgba(0,0,0,0.10));
  }
  .app-name {
    font-size: 1.65rem;
    font-weight: 700;
    letter-spacing: 5px;
    color: #c0392b;
    margin-bottom: 38px;
  }
  .spinner {
    width: 34px;
    height: 34px;
    border: 3px solid rgba(192, 57, 43, 0.15);
    border-top-color: #c0392b;
    border-radius: 50%;
    animation: spin 0.85s linear infinite;
    margin-bottom: 14px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .status {
    font-size: 0.71rem;
    color: #aaa;
    letter-spacing: 0.5px;
  }
</style>
</head>
<body>
  ${logoSrc ? `<img class="logo-img" src="${logoSrc}" alt="NETIFLOW" />` : ""}
  <div class="app-name">NETIFLOW</div>
  <div class="spinner"></div>
  <div class="status">Iniciando servidor...</div>
</body>
</html>`;

  loadingWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

// ─── Main Window ──────────────────────────────────────────────────────────────
function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false, // will show after ready-to-show
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    title: "NETIFLOW",
    icon: path.join(__dirname, "public/img/icon.png"),
    backgroundColor: "#0f0f1a",
  });

  mainWindow.once("ready-to-show", () => {
    if (loadingWindow && !loadingWindow.isDestroyed()) {
      loadingWindow.close();
      loadingWindow = null;
    }
    mainWindow.show();
    mainWindow.focus();
  });

  const url = `http://localhost:${port}`;

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    // Poll until the Next.js server is ready.
    // Accept ANY HTTP status code — the server is up if it responds at all.
    // (Next.js middleware returns 307 redirect to /login before auth, which
    //  would be rejected if we only checked for specific codes.)
    let attempts = 0;
    const maxAttempts = 150; // 30 seconds (150 * 200ms)

    const checkServer = () => {
      if (attempts++ > maxAttempts) {
        writeLog(`Server never became ready after ${maxAttempts} attempts`);
        if (loadingWindow && !loadingWindow.isDestroyed()) {
          loadingWindow.close();
        }
        dialog.showErrorBox(
          "NETIFLOW — Erro ao Iniciar",
          "O servidor interno não respondeu a tempo.\n\nVerifique o arquivo netiflow.log para mais detalhes.\n\nCaminho: " + path.dirname(process.execPath)
        );
        app.quit();
        return;
      }

      const req = http.get(url, (res) => {
        // Any HTTP response means the server is alive and ready.
        // Do NOT filter by status code — middleware may return 307, 301, etc.
        writeLog(`Server responded with status ${res.statusCode} — loading app...`);
        res.resume(); // consume response to free socket
        mainWindow.loadURL(url).catch((err) => {
          writeLog("loadURL error: " + err);
        });
      });
      req.on("error", () => setTimeout(checkServer, 200));
      req.setTimeout(1000, () => { req.destroy(); setTimeout(checkServer, 200); });
    };

    checkServer();
  }

  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDesc, url) => {
    if (isQuitting) return;
    writeLog(`Page failed to load (${errorCode}): ${errorDesc} — ${url}`);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ─── Port Finder ──────────────────────────────────────────────────────────────
function findOpenPort(startPort) {
  return new Promise((resolve) => {
    const server = require("net").createServer();
    server.listen(startPort, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on("error", () => resolve(findOpenPort(startPort + 1)));
  });
}

// ─── Auto Updater ─────────────────────────────────────────────────────────────
function setupAutoUpdater() {
  if (isDev) return;
  
  autoUpdater.autoDownload = false;
  
  autoUpdater.on("update-available", (info) => {
    dialog.showMessageBox({
      type: "info",
      title: "Atualização Disponível",
      message: `Uma nova versão do NETIFLOW (${info.version}) está disponível. Deseja baixar agora?`,
      buttons: ["Sim", "Não"]
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
  });

  autoUpdater.on("update-downloaded", () => {
    dialog.showMessageBox({
      type: "info",
      title: "Atualização Pronta",
      message: "A atualização foi baixada. O aplicativo será reiniciado para instalar a nova versão.",
      buttons: ["Reiniciar e Instalar", "Mais tarde"]
    }).then((result) => {
      if (result.response === 0) {
        isQuitting = true;
        autoUpdater.quitAndInstall(false, true);
      }
    });
  });

  autoUpdater.on("error", (err) => {
    writeLog("AutoUpdater Error: " + err);
  });

  // Aguarda 5 segundos antes de checar para não pesar na inicialização
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 5000);
}

// ─── App Ready ───────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  writeLog("=== NETIFLOW Starting (isDev=" + isDev + ") ===");

  setupAutoUpdater();

  // Show loading screen immediately
  if (!isDev) {
    createLoadingWindow();
  }

  // Database setup — non-fatal
  try {
    const { setupDatabase } = require("./src/db/setup.js");
    await setupDatabase();
    writeLog("Database setup completed.");
  } catch (error) {
    const msg = error && error.message ? error.message : String(error);
    writeLog("DB setup warning (app will still start): " + msg);
    // Non-fatal: app continues even if DB is unreachable
  }

  if (isDev) {
    createWindow(3000);
  } else {
    const port = await findOpenPort(3000);
    writeLog("Using port: " + port);

    const serverEnv = {
      ...process.env,
      PORT: port.toString(),
      NODE_ENV: "production",
      HOSTNAME: "127.0.0.1",
      NEXT_ENV_PATH: path.join(__dirname, ".env.local"),
      INSTALL_DIR: path.dirname(process.execPath),
    };

    const serverPath = path.join(__dirname, ".next/standalone/server.js");
    writeLog("Server path: " + serverPath);

    if (!fs.existsSync(serverPath)) {
      writeLog("FATAL: server.js not found at: " + serverPath);
      dialog.showErrorBox(
        "NETIFLOW — Instalação Corrompida",
        "Arquivo do servidor não encontrado.\n\nReinstale o NETIFLOW."
      );
      app.quit();
      return;
    }

    let serverLog = "";

    nextProcess = fork(serverPath, [], {
      env: serverEnv,
      stdio: "pipe",
    });

    nextProcess.stdout.on("data", (data) => {
      const msg = data.toString();
      serverLog += msg;
      writeLog("[SERVER] " + msg.trim());
    });

    nextProcess.stderr.on("data", (data) => {
      const msg = data.toString();
      serverLog += msg;
      writeLog("[SERVER ERR] " + msg.trim());
    });

    nextProcess.on("error", (err) => {
      writeLog("Fork error: " + err);
    });

    nextProcess.on("exit", (code, signal) => {
      if (!isQuitting && code !== 0) {
        const errorMsg = `Servidor interno encerrou inesperadamente.\n\nCódigo: ${code} | Sinal: ${signal}\n\nLog:\n${serverLog.slice(-800)}`;
        writeLog("Server exited: " + errorMsg);
        dialog.showErrorBox("NETIFLOW — Servidor Encerrado", errorMsg.substring(0, 1200));
      }
    });

    createWindow(port);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (isDev) createWindow(3000);
    }
  });
});

// ─── Cleanup ──────────────────────────────────────────────────────────────────
app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("quit", () => {
  if (nextProcess) {
    try { nextProcess.kill(); } catch (_) {}
  }
});
