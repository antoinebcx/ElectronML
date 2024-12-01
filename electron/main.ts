import { app, BrowserWindow } from 'electron';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';

let pythonProcess: ChildProcess | null = null;

function startPythonBackend() {
  const isDev = !app.isPackaged;
  
  if (isDev) {
    const uvicornPath = path.join(__dirname, '..', '..', 'backend', 'venv', 'bin', 'uvicorn');
    pythonProcess = spawn(uvicornPath, ['main:app', '--reload'], {
      cwd: path.join(__dirname, '..', '..', 'backend')
    });
  } else {
    const backendPath = path.join(
      process.resourcesPath,
      'backend-dist',
      process.platform === 'win32' ? 'backend.exe' : 'backend'
    );
    
    pythonProcess = spawn(backendPath);
  }

  pythonProcess.stdout?.on('data', (data) => {
    console.log(`Backend output: ${data}`);
  });

  pythonProcess.stderr?.on('data', (data) => {
    console.error(`Backend: ${data}`);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  const isDev = !app.isPackaged;
  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  startPythonBackend();
  createWindow();
});

app.on('window-all-closed', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});