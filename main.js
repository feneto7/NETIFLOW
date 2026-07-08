const { app, BrowserWindow } = require("electron");
const path = require("path");
const isDev = !app.isPackaged;
const { fork } = require("child_process");
const http = require("http");

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
  });

  const url = `http://localhost:${port}`;
  
  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    // Wait for the server to be ready before loading
    const checkServer = () => {
      http.get(url, (res) => {
        if (res.statusCode === 200 || res.statusCode === 404) {
          mainWindow.loadURL(url);
        } else {
          setTimeout(checkServer, 200);
        }
      }).on("error", () => {
        setTimeout(checkServer, 200);
      });
    };
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
      HOSTNAME: "127.0.0.1"
    };

    // Fork the standalone Next.js server
    nextProcess = fork(path.join(__dirname, ".next/standalone/server.js"), [], {
      env: serverEnv,
      stdio: "inherit",
    });

    createWindow(port);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (isDev) createWindow(3000);
    }
  });
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
