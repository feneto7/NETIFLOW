const { app, BrowserWindow, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const isDev = !app.isPackaged;
const { fork } = require("child_process");
const http = require("http");

function writeLog(message) {
  try {
    const installDir = isDev ? process.cwd() : path.dirname(process.execPath);
    const logPath = path.join(installDir, "log.txt");
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`, "utf8");
  } catch (err) {
    console.error("Failed to write to log.txt", err);
  }
}

let mainWindow;
let nextProcess;

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    title: "NETIFLOW",
    icon: path.join(__dirname, "public/img/icon.png")
  });

  const url = `http://localhost:${port}`;
  
  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    const checkServer = () => {
      http.get(url, (res) => {
        if (res.statusCode === 200 || res.statusCode === 404) {
          mainWindow.loadURL(url);
          // Forçar abrir DevTools em produção para debug
          mainWindow.webContents.openDevTools();
        } else {
          setTimeout(checkServer, 200);
        }
      }).on("error", (err) => {
        setTimeout(checkServer, 200);
      });
    };
    
    // Fallback: se passar 10 segundos e não conectar, mostra devtools
    setTimeout(() => {
      mainWindow.webContents.openDevTools();
    }, 10000);
    
    checkServer();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function findOpenPort(startPort) {
  return new Promise((resolve) => {
    const server = require("net").createServer();
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on("error", () => {
      resolve(findOpenPort(startPort + 1));
    });
  });
}

app.whenReady().then(async () => {
  try {
    const { setupDatabase } = require("./src/db/setup.js");
    await setupDatabase();
  } catch (error) {
    console.error("Erro fatal no setup do banco de dados:", error);
    writeLog("Erro fatal no setup do banco de dados: " + (error.stack || error));
  }

  if (isDev) {
    createWindow(3000);
  } else {
    // Find an open port
    const port = await findOpenPort(3000);
    
    // Set up the environment for the Next.js standalone server
    const serverEnv = {
      ...process.env,
      PORT: port.toString(),
      NODE_ENV: "production",
      HOSTNAME: "127.0.0.1",
      NEXT_ENV_PATH: path.join(__dirname, ".env.local"),
      INSTALL_DIR: isDev ? process.cwd() : path.dirname(process.execPath)
    };

    let serverLog = "";

    // Fork the standalone Next.js server
    nextProcess = fork(path.join(__dirname, ".next/standalone/server.js"), [], {
      env: serverEnv,
      stdio: "pipe",
    });

    nextProcess.stdout.on("data", (data) => {
      serverLog += data.toString();
      console.log("NEXT:", data.toString());
    });

    nextProcess.stderr.on("data", (data) => {
      serverLog += data.toString();
      console.error("NEXT ERR:", data.toString());
    });

    nextProcess.on("exit", (code, signal) => {
      if (!isQuitting && code !== 0) {
        const errorMsg = `The background server exited with code ${code} (signal: ${signal}).\n\nLogs:\n${serverLog}`;
        writeLog("Next.js Server Crashed:\n" + errorMsg);
        dialog.showErrorBox(
          "Next.js Server Crashed", 
          errorMsg.substring(0, 1000)
        );
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

let isQuitting = false;

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
    nextProcess.kill();
  }
});
