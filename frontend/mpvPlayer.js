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
let lastPipBounds = null;
let latestMpvProperties = {};

const observedMpvProperties = [
  [1, 'time-pos'],
  [2, 'pause'],
  [3, 'volume'],
  [4, 'duration'],
  [5, 'chapter-list'],
  [6, 'track-list'],
  [7, 'speed'],
  [8, 'eof-reached'],
  [9, 'video-params'],
  [10, 'mute'],
];

const snapshotRequestIds = new Map(
  observedMpvProperties.map(([id, name]) => [1000 + id, name])
);

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
    latestMpvProperties = {};
    if (mpvProcess) {
      mpvProcess.removeAllListeners('exit');
      try { mpvProcess.kill('SIGKILL'); } catch { /* ignore */ }
      mpvProcess = null;
    }
    if (mpvSocket) {
      try {
        mpvSocket.end();
        mpvSocket.destroy();
      } catch { /* ignore */ }
      mpvSocket = null;
    }

    if (controlsWindow && !controlsWindow.isDestroyed()) {
      try { controlsWindow.destroy(); } catch { /* ignore */ }
      controlsWindow = null;
    }

    if (mpvPlayerWindow && !mpvPlayerWindow.isDestroyed()) {
      try { mpvPlayerWindow.destroy(); } catch { /* ignore */ }
      mpvPlayerWindow = null;
    }
  }

  ipcMain.handle('mpv-open-fullscreen', async (event, { itemId, start, url, title: customTitle }) => {
    writeElectronLog('INFO', 'mpv-open-fullscreen requested', { itemId, start, url, customTitle });

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
 
    mpvPlayerWindow.on('move', () => {
      if (isPip && mpvPlayerWindow && !mpvPlayerWindow.isDestroyed()) {
        lastPipBounds = mpvPlayerWindow.getBounds();
      }
    });

    mpvPlayerWindow.on('resize', () => {
      if (isPip && mpvPlayerWindow && !mpvPlayerWindow.isDestroyed()) {
        lastPipBounds = mpvPlayerWindow.getBounds();
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
        } catch { /* ignore */ }
      }
    }

    // Fetch video info from backend to spawn MPV
    try {
      let filePath = '';
      let playbackInfo = {};

      if (url) {
        filePath = url;
        playbackInfo = {
          file_path: url,
          title: customTitle || 'Trailer',
          duration: 0,
          start_seconds: 0
        };
      } else {
        const res = await fetch(`http://localhost:${backendPort}/api/v1/media/playback-info/${itemId}`);
        if (!res.ok) throw new Error('Failed to get playback info');
        playbackInfo = await res.json();
        filePath = playbackInfo.file_path;

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
      }

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
        '--keep-open=yes',
        '--vo=gpu',
        '--gpu-api=d3d11',
        '--hwdec=auto',
        '--sub-auto=all',
        '--sub-file-paths=sub;subs;subtitles;Extras;extras;srt',
        '--audio-file-auto=all',
        '--audio-file-paths=sub;subs;subtitles;Extras;extras;audio;audios',
      ];

      const startSec = start !== undefined ? start : (playbackInfo.start_seconds || 0);
      if (startSec > 0) {
        args.push(`--start=${startSec}`);
      }

      if (playbackInfo.extras && Array.isArray(playbackInfo.extras)) {
        playbackInfo.extras.forEach(extra => {
          if (extra.category === 'subtitle' && extra.path) {
            args.push(`--sub-file=${extra.path}`);
          } else if (extra.category === 'audio' && extra.path) {
            args.push(`--audio-file=${extra.path}`);
          }
        });
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

          observedMpvProperties.forEach(([id, name]) => {
            mpvSocket.write(JSON.stringify({ command: ["observe_property", id, name] }) + '\n');
          });
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
              if (parsed.event === 'property-change' && parsed.name) {
                latestMpvProperties[parsed.name] = parsed.data;
              } else if (snapshotRequestIds.has(parsed.request_id)) {
                const propertyName = snapshotRequestIds.get(parsed.request_id);
                latestMpvProperties[propertyName] = parsed.data;
                parsed.event = 'property-change';
                parsed.name = propertyName;
              }
              // Send events to the controls window!
              if (controlsWindow && !controlsWindow.isDestroyed()) {
                controlsWindow.webContents.send('mpv-event', parsed);
              }

              // Forward state updates to the mainWindow for the floating control bar
              if (mainWindow && !mainWindow.isDestroyed()) {
                if (parsed.event === 'property-change') {
                  if (parsed.name === 'time-pos' && typeof parsed.data === 'number') {
                    mainWindow.webContents.send('player-state-update', { event: 'time-pos', currentTime: parsed.data });
                  }
                  if (parsed.name === 'duration' && typeof parsed.data === 'number') {
                    mainWindow.webContents.send('player-state-update', { event: 'duration', duration: parsed.data });
                  }
                  if (parsed.name === 'pause' && typeof parsed.data === 'boolean') {
                    mainWindow.webContents.send('player-state-update', { event: 'pause', isPaused: parsed.data });
                  }
                }
              }
            } catch { /* ignore */ }
          }
        });
      }, 400);

      let controlsUrl = '';
      if (url) {
        const encodedTitle = encodeURIComponent(customTitle || 'Trailer');
        controlsUrl = isDev
          ? `http://localhost:5173/?backend_port=${backendPort}&controls_only=true&title=${encodedTitle}&is_trailer=true#/player/trailer`
          : `file://${path.join(__dirname, 'build', 'index.html')}?backend_port=${backendPort}&controls_only=true&title=${encodedTitle}&is_trailer=true#/player/trailer`;
      } else {
        controlsUrl = isDev
          ? `http://localhost:5173/?backend_port=${backendPort}&controls_only=true&start=${startSec}#/player/${itemId}`
          : `file://${path.join(__dirname, 'build', 'index.html')}?backend_port=${backendPort}&controls_only=true&start=${startSec}#/player/${itemId}`;
      }

      controlsWindow.loadURL(controlsUrl);

      controlsWindow.webContents.once('dom-ready', () => {
        if (controlsWindow && !controlsWindow.isDestroyed()) {
          controlsWindow.show();
          controlsWindow.focus();
          Object.entries(latestMpvProperties).forEach(([name, data]) => {
            controlsWindow.webContents.send('mpv-event', {
              event: 'property-change',
              name,
              data
            });
          });
          if (mpvSocket && !mpvSocket.destroyed) {
            observedMpvProperties.forEach(([id, name]) => {
              mpvSocket.write(JSON.stringify({
                command: ['get_property', name],
                request_id: 1000 + id
              }) + '\n');
            });
          }
        }
      });

      if (controlsWindow && !controlsWindow.isDestroyed()) {
        controlsWindow.webContents.once('did-finish-load', () => {
          // Send initial details to controls Window
        });
      }

      // Notify mainWindow that video playback has started
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('player-state-update', {
          event: 'start',
          itemId: String(itemId),
          title: title,
          duration: playbackInfo.duration || 0,
          currentTime: startSec,
          isPaused: false,
          isPip: false,
          isMinimized: false
        });
      }
    } catch (err) {
      writeElectronLog('ERROR', 'Error starting MPV', { error: err.message, stack: err.stack });
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
  function setPipMode(enable) {
    if (!mpvPlayerWindow || mpvPlayerWindow.isDestroyed()) return;
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.bounds;

    isPip = enable;

    if (isPip) {
      mpvPlayerWindow.setFullScreen(false);
      if (controlsWindow && !controlsWindow.isDestroyed()) {
        controlsWindow.setFullScreen(false);
      }

      let pipBounds = lastPipBounds;
      if (!pipBounds) {
        const pipWidth = 384;
        const pipHeight = 216;
        const x = width - pipWidth - 20;
        const y = height - pipHeight - 50;
        pipBounds = { x, y, width: pipWidth, height: pipHeight };
      }

      mpvPlayerWindow.setBounds(pipBounds);
      mpvPlayerWindow.setAlwaysOnTop(true, 'screen-saver');

      if (controlsWindow && !controlsWindow.isDestroyed()) {
        controlsWindow.setResizable(true);
        controlsWindow.setMinimumSize(280, 157);
        controlsWindow.setMaximumSize(960, 540);
        controlsWindow.setBounds(pipBounds);
        controlsWindow.setAlwaysOnTop(true, 'screen-saver');
        controlsWindow.webContents.send('pip-mode-change', { isPip: true });
      }

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('player-state-update', { event: 'pip-change', isPip: true });
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

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('player-state-update', { event: 'pip-change', isPip: false });
      }
    }
  }

  ipcMain.on('mpv-toggle-pip', () => {
    setPipMode(!isPip);
  });

  ipcMain.on('mpv-minimize', () => {
    if (!mpvPlayerWindow || mpvPlayerWindow.isDestroyed()) return;

    mpvPlayerWindow.setAlwaysOnTop(false);
    mpvPlayerWindow.minimize();

    if (controlsWindow && !controlsWindow.isDestroyed()) {
      controlsWindow.setAlwaysOnTop(false);
      controlsWindow.minimize();
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('player-state-update', { event: 'minimize-change', isMinimized: true });
    }
  });

  ipcMain.on('mpv-restore', () => {
    if (!mpvPlayerWindow || mpvPlayerWindow.isDestroyed()) return;

    mpvPlayerWindow.restore();
    if (controlsWindow && !controlsWindow.isDestroyed()) {
      controlsWindow.restore();
    }

    if (isPip) {
      setPipMode(false);
    } else {
      mpvPlayerWindow.show();
      if (controlsWindow && !controlsWindow.isDestroyed()) {
        controlsWindow.show();
        controlsWindow.focus();
      }
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('player-state-update', { event: 'minimize-change', isMinimized: false });
    }
  });

  ipcMain.on('mpv-close', () => {
    writeElectronLog('INFO', 'mpv-close requested');
    isPip = false;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('player-state-update', { event: 'close' });
    }
    if (mpvProcess) {
      try { mpvProcess.kill(); } catch { /* ignore */ }
      mpvProcess = null;
    }
    if (mpvSocket) {
      try { mpvSocket.end(); } catch { /* ignore */ }
      mpvSocket = null;
    }
    if (controlsWindow && !controlsWindow.isDestroyed()) {
      try { controlsWindow.close(); } catch { /* ignore */ }
      controlsWindow = null;
    }
    if (mpvPlayerWindow && !mpvPlayerWindow.isDestroyed()) {
      try { mpvPlayerWindow.close(); } catch { /* ignore */ }
      mpvPlayerWindow = null;
    }
  });

  ipcMain.on('theme-changed', (event, newTheme) => {
    if (controlsWindow && !controlsWindow.isDestroyed()) {
      controlsWindow.webContents.send('theme-changed', newTheme);
    }
  });
}
