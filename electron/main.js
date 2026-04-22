const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

let mainWindow
let nextProcess

const isDev = process.env.NODE_ENV !== 'production'
const PORT = process.env.PORT || 3331

// --- Auto-updater ---
let autoUpdater = null

function setupAutoUpdater() {
  if (isDev) return // No auto-update in dev

  try {
    autoUpdater = require('electron-updater').autoUpdater
  } catch {
    console.log('electron-updater not available, skipping auto-update')
    return
  }

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // Configure update source — change this to your actual update server
  // Options: GitHub Releases, custom server, or S3
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: 'https://updates.bitepos.com' // Change to your update server
  })

  // Or use GitHub Releases:
  // autoUpdater.setFeedURL({
  //   provider: 'github',
  //   owner: 'your-github-org',
  //   repo: 'bitepos'
  // })

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

  // Check for updates on launch (after 3s delay)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(err => {
      console.error('Update check failed:', err.message)
    })
  }, 3000)

  // Check every 4 hours
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
    const nextBin = isDev ? 'next' : path.join(process.resourcesPath, 'app', 'node_modules', '.bin', 'next')
    const cwd = isDev ? process.cwd() : path.join(process.resourcesPath, 'app')

    nextProcess = spawn(
      isDev ? 'npm' : nextBin,
      isDev ? ['run', 'dev'] : ['start'],
      {
        cwd,
        env: {
          ...process.env,
          PORT: String(PORT),
          NODE_ENV: isDev ? 'development' : 'production',
        },
        shell: true,
      }
    )

    nextProcess.stdout.on('data', (data) => {
      const output = data.toString()
      console.log('Next.js:', output)
      if (output.includes('ready') || output.includes('started')) {
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

    // Timeout fallback
    setTimeout(resolve, 5000)
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
    await startNextServer()
    mainWindow.loadURL(`http://localhost:${PORT}/en/login`)
  }
}

app.whenReady().then(async () => {
  createWindow()
  await loadApp()

  // Setup auto-updater
  setupAutoUpdater()

  // Set application menu
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

// Auto-update IPC handlers
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
  // Will quit and install on next launch
  autoUpdater.quitAndInstall(false, true)
})

ipcMain.handle('get-update-status', async () => {
  // Return current update state — just a placeholder, real state comes from events
  return { status: 'idle' }
})