import { ipcMain, BrowserWindow, screen } from 'electron';
import { spawn } from 'child_process';
import net from 'net';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mpvPlayerWindow = null;
let controlsWindow = null;
let mpvProcess = null;
let mpvSocket = null;
let mpvSocketPath = null;
let isPip = false;

export function setupMpvPlayer(mainWindow, isDev, writeElectronLog) {
  function getWindowIconPath() {
    const isWindows = process.platform === 'win32';
    const relativePath = isWindows
      ? (isDev ? 'public/favicon/icon.ico' : 'build/favicon/icon.ico')
      : (isDev ? 'public/favicon/96x96.png' : 'build/favicon/96x96.png');

    return path.join(__dirname, relativePath);
  }

  function getMpvExecutablePath() {
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      const bundledPath = isDev
        ? path.join(__dirname, 'bin', 'win', 'mpv.exe')
        : path.join(process.resourcesPath, 'bin', 'win', 'mpv.exe');
      if (fs.existsSync(bundledPath)) {
        return bundledPath;
      }
      return 'mpv.exe';
    }
    return 'mpv';
  }

  async function cleanupExistingMpv() {
    isPip = false;
    if (mpvProcess) {
      mpvProcess.removeAllListeners('exit');
      try { mpvProcess.kill('SIGKILL'); } catch (e) { }
      mpvProcess = null;
    }
    if (mpvSocket) {
      try {
        mpvSocket.end();
        mpvSocket.destroy();
      } catch (e) { }
      mpvSocket = null;
    }

    if (controlsWindow && !controlsWindow.isDestroyed()) {
      try { controlsWindow.destroy(); } catch (e) { }
      controlsWindow = null;
    }

    if (mpvPlayerWindow && !mpvPlayerWindow.isDestroyed()) {
      try { mpvPlayerWindow.destroy(); } catch (e) { }
      mpvPlayerWindow = null;
    }
  }

  ipcMain.handle('mpv-open-fullscreen', async (event, { itemId }) => {
    writeElectronLog('INFO', 'mpv-open-fullscreen requested', { itemId });

    await cleanupExistingMpv();

    // Get primary display screen size for true fullscreen
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.bounds;

    // 1. Create native video window (transparent so Chromium doesn't paint black over MPV)
    mpvPlayerWindow = new BrowserWindow({
      title: 'SWAYA',
      icon: getWindowIconPath(),
      frame: false,
      transparent: true,
      x: 0,
      y: 0,
      width,
      height,
      show: true,
      alwaysOnTop: false,
      focusable: false,
      fullscreen: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    const handle = mpvPlayerWindow.getNativeWindowHandle();
    const wid = handle.readBigUInt64LE(0).toString();

    // 2. Create transparent controls window on top
    controlsWindow = new BrowserWindow({
      parent: mpvPlayerWindow,
      title: 'SWAYA',
      icon: getWindowIconPath(),
      frame: false,
      transparent: true,
      x: 0,
      y: 0,
      width,
      height,
      show: true,
      alwaysOnTop: true,
      focusable: true,
      fullscreen: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        backgroundThrottling: false
      }
    });

    const syncBounds = () => {
      if (isPip && controlsWindow && !controlsWindow.isDestroyed() && mpvPlayerWindow && !mpvPlayerWindow.isDestroyed()) {
        const bounds = controlsWindow.getBounds();
        mpvPlayerWindow.setBounds(bounds);
      }
    };

    controlsWindow.on('resize', syncBounds);
    controlsWindow.on('move', syncBounds);

    // Resolve port
    let backendPort = 8000;
    const possiblePortPaths = [
      path.join(__dirname, '..', 'port.txt'),
      path.join(__dirname, 'port.txt'),
      path.join(process.resourcesPath, 'backend', 'port.txt'),
    ];
    for (const p of possiblePortPaths) {
      if (fs.existsSync(p)) {
        try {
          const content = fs.readFileSync(p, 'utf8').trim();
          const parsed = parseInt(content, 10);
          if (!isNaN(parsed)) {
            backendPort = parsed;
            break;
          }
        } catch (e) { }
      }
    }

    // Fetch video info from backend to spawn MPV
    try {
      const res = await fetch(`http://localhost:${backendPort}/api/v1/media/playback-info/${itemId}`);
      if (!res.ok) throw new Error('Failed to get playback info');
      const playbackInfo = await res.json();
      const filePath = playbackInfo.file_path;

      // Register active session immediately in backend
      fetch(`http://localhost:${backendPort}/api/v1/media/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: String(itemId),
          current_time: Math.round(playbackInfo.start_seconds || 0),
          total_length: Math.round(playbackInfo.duration || 0)
        })
      }).catch(() => {});

      const title = playbackInfo.title || 'SWAYA';
      if (mpvPlayerWindow && !mpvPlayerWindow.isDestroyed()) {
        mpvPlayerWindow.setTitle(title);
      }
      if (controlsWindow && !controlsWindow.isDestroyed()) {
        controlsWindow.setTitle(title);
      }

      const uniqueId = Date.now();
      mpvSocketPath = process.platform === 'win32'
        ? `\\\\.\\pipe\\mpv-ipc-${uniqueId}`
        : `/tmp/mpv-ipc-${uniqueId}`;

      const mpvExecutable = getMpvExecutablePath();
      const args = [
        `--wid=${wid}`,
        `--input-ipc-server=${mpvSocketPath}`,
        '--no-border',
        '--no-window-dragging',
        '--force-window=yes',
        '--idle=yes',
        '--vo=gpu',
        '--gpu-api=d3d11',
        '--hwdec=auto',
        '--sub-auto=all',
        '--sub-file-paths=sub;subs;subtitles;Extras;extras;srt',
        '--audio-file-auto=all',
        '--audio-file-paths=sub;subs;subtitles;Extras;extras;audio;audios',
      ];

      if (playbackInfo.start_seconds > 0) {
        args.push(`--start=${playbackInfo.start_seconds}`);
      }

      args.push(filePath);

      writeElectronLog('INFO', 'Spawning MPV', { mpvExecutable, args });
      mpvProcess = spawn(mpvExecutable, args);

      mpvProcess.stdout.on('data', (data) => {
        writeElectronLog('INFO', `MPV STDOUT: ${data.toString().trim()}`);
      });

      mpvProcess.stderr.on('data', (data) => {
        writeElectronLog('WARN', `MPV STDERR: ${data.toString().trim()}`);
      });

      const spawnedProcess = mpvProcess;
      mpvProcess.on('exit', (code) => {
        writeElectronLog('INFO', 'MPV Process exited', { code });
        if (mpvProcess === spawnedProcess) {
          if (controlsWindow && !controlsWindow.isDestroyed()) {
            controlsWindow.close();
            controlsWindow = null;
          }
          if (mpvPlayerWindow && !mpvPlayerWindow.isDestroyed()) {
            mpvPlayerWindow.close();
            mpvPlayerWindow = null;
          }
        }
      });

      // Connect to named pipe IPC
      setTimeout(() => {
        mpvSocket = net.createConnection(mpvSocketPath, () => {
          writeElectronLog('INFO', 'Connected to MPV IPC socket');

          // Observe properties
          mpvSocket.write(JSON.stringify({ command: ["observe_property", 1, "time-pos"] }) + '\n');
          mpvSocket.write(JSON.stringify({ command: ["observe_property", 2, "pause"] }) + '\n');
          mpvSocket.write(JSON.stringify({ command: ["observe_property", 3, "volume"] }) + '\n');
          mpvSocket.write(JSON.stringify({ command: ["observe_property", 4, "duration"] }) + '\n');
          mpvSocket.write(JSON.stringify({ command: ["observe_property", 5, "chapter-list"] }) + '\n');
          mpvSocket.write(JSON.stringify({ command: ["observe_property", 6, "track-list"] }) + '\n');
        });

        let buffer = '';
        mpvSocket.on('data', (data) => {
          buffer += data.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              // Send events to the controls window!
              if (controlsWindow && !controlsWindow.isDestroyed()) {
                controlsWindow.webContents.send('mpv-event', parsed);
              }
            } catch (e) { }
          }
        });
      }, 400);

      // Load controls route in controlsWindow
      const controlsUrl = isDev
        ? `http://localhost:5173/?backend_port=${backendPort}&controls_only=true#/player/${itemId}`
        : `file://${path.join(__dirname, 'build', 'index.html')}?backend_port=${backendPort}&controls_only=true#/player/${itemId}`;

      controlsWindow.loadURL(controlsUrl);

      controlsWindow.webContents.once('dom-ready', () => {
        if (controlsWindow && !controlsWindow.isDestroyed()) {
          controlsWindow.show();
          controlsWindow.focus();
        }
      });

      if (controlsWindow && !controlsWindow.isDestroyed()) {
        controlsWindow.focus();
      }

    } catch (err) {
      writeElectronLog('ERROR', 'Failed starting MPV fullscreen', {
        message: err.message,
        stack: err.stack
      });
      if (controlsWindow && !controlsWindow.isDestroyed()) controlsWindow.close();
      if (mpvPlayerWindow && !mpvPlayerWindow.isDestroyed()) mpvPlayerWindow.close();
      return { success: false, error: err.message };
    }

    return { success: true };
  });

  ipcMain.on('mpv-command', (event, commandArgs) => {
    if (mpvSocket && !mpvSocket.destroyed) {
      mpvSocket.write(JSON.stringify({ command: commandArgs }) + '\n');
    }
  });

  let isPipLocal = false; // We use the file-level isPip variable instead
  ipcMain.on('mpv-toggle-pip', (event) => {
    if (!mpvPlayerWindow || mpvPlayerWindow.isDestroyed()) return;

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.bounds;

    isPip = !isPip;

    if (isPip) {
      mpvPlayerWindow.setFullScreen(false);
      if (controlsWindow && !controlsWindow.isDestroyed()) {
        controlsWindow.setFullScreen(false);
      }

      const pipWidth = 384;
      const pipHeight = 216;
      const x = width - pipWidth - 20;
      const y = height - pipHeight - 50;

      mpvPlayerWindow.setBounds({ x, y, width: pipWidth, height: pipHeight });
      mpvPlayerWindow.setAlwaysOnTop(true, 'screen-saver');

      if (controlsWindow && !controlsWindow.isDestroyed()) {
        controlsWindow.setResizable(true);
        controlsWindow.setMinimumSize(280, 157);
        controlsWindow.setMaximumSize(960, 540);
        controlsWindow.setBounds({ x, y, width: pipWidth, height: pipHeight });
        controlsWindow.setAlwaysOnTop(true, 'screen-saver');
        controlsWindow.webContents.send('pip-mode-change', { isPip: true });
      }

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
    } else {
      if (controlsWindow && !controlsWindow.isDestroyed()) {
        controlsWindow.setResizable(false);
      }
      mpvPlayerWindow.setAlwaysOnTop(false);
      mpvPlayerWindow.setBounds({ x: 0, y: 0, width, height });
      mpvPlayerWindow.setFullScreen(true);

      if (controlsWindow && !controlsWindow.isDestroyed()) {
        controlsWindow.setAlwaysOnTop(true);
        controlsWindow.setBounds({ x: 0, y: 0, width, height });
        controlsWindow.setFullScreen(true);
        controlsWindow.webContents.send('pip-mode-change', { isPip: false });
        controlsWindow.focus();
      }
    }
  });

  ipcMain.on('mpv-close', () => {
    writeElectronLog('INFO', 'mpv-close requested');
    isPip = false;
    if (mpvProcess) {
      try { mpvProcess.kill(); } catch (e) { }
      mpvProcess = null;
    }
    if (mpvSocket) {
      try { mpvSocket.end(); } catch (e) { }
      mpvSocket = null;
    }
    if (controlsWindow && !controlsWindow.isDestroyed()) {
      try { controlsWindow.close(); } catch (e) { }
      controlsWindow = null;
    }
    if (mpvPlayerWindow && !mpvPlayerWindow.isDestroyed()) {
      try { mpvPlayerWindow.close(); } catch (e) { }
      mpvPlayerWindow = null;
    }
  });
}
