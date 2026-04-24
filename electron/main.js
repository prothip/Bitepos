const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

let mainWindow
let nextProcess

const isDev = process.env.NODE_ENV !== 'production' || process.env.OPENCLAW_DEV === '1'
const PORT = process.env.PORT || 3331

// --- Auto-updater ---
let autoUpdater = null

function setupAutoUpdater() {
  if (isDev) return

  try {
    autoUpdater = require('electron-updater').autoUpdater
  } catch {
    console.log('electron-updater not available, skipping auto-update')
    return
  }

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.setFeedURL({
    provider: 'generic',
    url: 'https://updates.bitepos.com'
  })

  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...')
    sendToWindow('update-status', { status: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version)
    sendToWindow('update-status', { 
      status: 'available', 
      version: info.version,
      releaseNotes: info.releaseNotes || ''
    })
  })

  autoUpdater.on('update-not-available', () => {
    console.log('App is up to date')
    sendToWindow('update-status', { status: 'up-to-date' })
  })

  autoUpdater.on('download-progress', (progress) => {
    sendToWindow('update-status', {
      status: 'downloading',
      percent: Math.round(progress.percent),
      speed: Math.round(progress.bytesPerSecond / 1024),
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info.version)
    sendToWindow('update-status', { 
      status: 'downloaded',
      version: info.version
    })
  })

  autoUpdater.on('error', (err) => {
    console.error('Update error:', err.message)
    sendToWindow('update-status', { status: 'error', error: err.message })
  })

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(err => {
      console.error('Update check failed:', err.message)
    })
  }, 3000)

  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 4 * 60 * 60 * 1000)
}

function sendToWindow(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data)
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hiddenInset',
    title: 'BitePOS POS',
    icon: path.join(__dirname, '../public/icon.png'),
    backgroundColor: '#f8fafc',
    show: false,
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    if (isDev) {
      mainWindow.webContents.openDevTools()
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function startNextServer() {
  return new Promise((resolve, reject) => {
    // extraResources copies .next/standalone → resources/app/
    // So server.js is at resources/app/server.js, NOT resources/app/.next/standalone/
    const standaloneDir = path.join(process.resourcesPath, 'app')
    const serverFile = path.join(standaloneDir, 'server.js')
    const dbPath = path.join(standaloneDir, 'dev.db')

    console.log('Starting Next.js standalone server from:', standaloneDir)
    console.log('Server file:', serverFile)
    console.log('DB path:', dbPath)
    console.log('Server file exists:', require('fs').existsSync(serverFile))
    console.log('DB exists:', require('fs').existsSync(dbPath))

    // Set up environment for standalone server
    const serverEnv = {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: 'production',
      HOSTNAME: 'localhost',
      DATABASE_URL: `file:${dbPath}`,
    }

    nextProcess = spawn(process.execPath, [serverFile], {
      cwd: standaloneDir,
      env: serverEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    nextProcess.stdout.on('data', (data) => {
      const output = data.toString()
      console.log('Next.js:', output)
      if (output.includes('ready') || output.includes('started') || output.includes('Listening')) {
        resolve()
      }
    })

    nextProcess.stderr.on('data', (data) => {
      console.error('Next.js Error:', data.toString())
    })

    nextProcess.on('error', (err) => {
      console.error('Failed to start Next.js:', err)
      reject(err)
    })

    // Timeout fallback — server might start without printing "ready"
    setTimeout(resolve, 8000)
  })
}

async function loadApp() {
  if (isDev) {
    try {
      await mainWindow.loadURL(`http://localhost:${PORT}/en/login`)
    } catch {
      console.log('Waiting for Next.js server...')
      setTimeout(() => loadApp(), 2000)
    }
  } else {
    try {
      await startNextServer()
      // Wait a bit for server to be ready
      await new Promise(r => setTimeout(r, 1000))
      await mainWindow.loadURL(`http://localhost:${PORT}/en/login`)
    } catch (err) {
      console.error('Failed to start app:', err)
      // Fallback: show error page with details
      mainWindow.loadURL(`data:text/html,<html><body style='font-family:sans-serif;padding:40px'><h1>Failed to start server</h1><p>${encodeURIComponent(err.message)}</p><p>Please check the logs and try again.</p></body></html>`)
    }
  }
}

app.whenReady().then(async () => {
  createWindow()
  await loadApp()

  setupAutoUpdater()

  const template = [
    {
      label: 'BitePOS POS',
      submenu: [
        { label: 'POS Terminal', click: () => mainWindow.loadURL(`http://localhost:${PORT}/en/pos`) },
        { label: 'Admin Panel', click: () => mainWindow.loadURL(`http://localhost:${PORT}/en/admin`) },
        { type: 'separator' },
        { 
          label: 'Check for Updates...', 
          click: () => {
            if (autoUpdater) {
              autoUpdater.checkForUpdates()
            } else {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Updates',
                message: 'Auto-update is not available in development mode.'
              })
            }
          }
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
      loadApp()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (nextProcess) {
      nextProcess.kill()
    }
    app.quit()
  }
})

app.on('before-quit', () => {
  if (nextProcess) {
    nextProcess.kill()
  }
})

// IPC handlers
ipcMain.handle('get-app-version', () => app.getVersion())

ipcMain.handle('print-receipt', async (event, receiptData) => {
  console.log('Print receipt:', receiptData)
  return { success: true }
})

ipcMain.handle('open-cash-drawer', async () => {
  console.log('Opening cash drawer')
  return { success: true }
})

ipcMain.handle('check-for-updates', async () => {
  if (!autoUpdater) return { available: false, error: 'Auto-updater not available' }
  try {
    const result = await autoUpdater.checkForUpdates()
    return { available: !!result, version: result?.updateInfo?.version }
  } catch (err) {
    return { available: false, error: err.message }
  }
})

ipcMain.handle('download-update', async () => {
  if (!autoUpdater) return { error: 'Auto-updater not available' }
  try {
    await autoUpdater.downloadUpdate()
    return { success: true }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('install-update', async () => {
  if (!autoUpdater) return
  autoUpdater.quitAndInstall(false, true)
})

ipcMain.handle('get-update-status', async () => {
  return { status: 'idle' }
})