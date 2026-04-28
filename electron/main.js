const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const http = require('http')
const fs = require('fs')

let mainWindow
let nextProcess
let serverLogs = []

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
    if (isDev) mainWindow.webContents.openDevTools()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function checkServerReady(maxAttempts = 60, intervalMs = 500) {
  return new Promise((resolve) => {
    let attempts = 0
    const check = () => {
      attempts++
      const req = http.get(`http://localhost:${PORT}/api/health`, (res) => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(true)
          } else if (attempts >= maxAttempts) {
            resolve(false)
          } else {
            setTimeout(check, intervalMs)
          }
        })
      })
      req.on('error', () => {
        if (attempts >= maxAttempts) {
          resolve(false)
        } else {
          setTimeout(check, intervalMs)
        }
      })
      req.setTimeout(3000, () => {
        req.destroy()
        if (attempts >= maxAttempts) {
          resolve(false)
        } else {
          setTimeout(check, intervalMs)
        }
      })
    }
    check()
  })
}

function startNextServer() {
  return new Promise((resolve, reject) => {
    const appPath = app.getAppPath()
    const isAsar = appPath.includes('.asar')
    const standaloneDir = isAsar
      ? appPath.replace('.asar', '.asar.unpacked') + '/.next/standalone'
      : path.join(appPath, '.next', 'standalone')
    const serverFile = path.join(standaloneDir, 'server.js')
    const dbPath = path.join(standaloneDir, 'dev.db')

    console.log('=== BITEPOS DEBUG ===')
    console.log('appPath:', appPath)
    console.log('isAsar:', isAsar)
    console.log('standaloneDir:', standaloneDir)
    console.log('serverFile:', serverFile)
    console.log('serverFile exists:', fs.existsSync(serverFile))
    console.log('dbPath exists:', fs.existsSync(dbPath))
    console.log('=== END DEBUG ===')

    if (!fs.existsSync(serverFile)) {
      const asarDir = path.join(appPath, '.next', 'standalone')
      if (fs.existsSync(path.join(asarDir, 'server.js'))) {
        console.log('Found server.js inside ASAR, but need unpacked for native modules')
        reject(new Error('Server found in ASAR but native modules need unpacked. Check asarUnpack config.'))
        return
      }
      reject(new Error(`server.js not found at ${serverFile}`))
      return
    }

    // Build the server environment
    const serverEnv = {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: 'production',
      HOSTNAME: 'localhost',
      DATABASE_URL: `file:${dbPath}`,
      // DO NOT set ELECTRON_RUN_AS_NODE — it breaks Next.js server
      NEXT_PUBLIC_LICENSE_SERVER: process.env.NEXT_PUBLIC_LICENSE_SERVER || 'https://bitepos-cloud-production.up.railway.app',
    }

    // JWT_SECRET: use env var or generate a stable one per install
    if (!serverEnv.JWT_SECRET) {
      // Generate a stable secret from the app path (same every launch)
      const crypto = require('crypto')
      serverEnv.JWT_SECRET = crypto.createHash('sha256').update(appPath + '-bitepos-jwt').digest('hex')
      console.log('Generated stable JWT_SECRET from app path')
    }

    nextProcess = spawn(process.execPath, [serverFile], {
      cwd: standaloneDir,
      env: serverEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    nextProcess.stdout.on('data', (data) => {
      const output = data.toString()
      serverLogs.push(output)
      console.log('Next.js:', output.trim())
    })

    nextProcess.stderr.on('data', (data) => {
      const output = data.toString()
      serverLogs.push('[STDERR] ' + output)
      console.error('Next.js Error:', output.trim())
    })

    nextProcess.on('error', (err) => {
      console.error('Failed to start Next.js:', err)
      reject(err)
    })

    nextProcess.on('exit', (code, signal) => {
      console.log(`Next.js process exited with code ${code}, signal ${signal}`)
      if (code !== 0 && code !== null) {
        serverLogs.push(`Process exited with code ${code}`)
      }
    })

    // Wait for server to respond (up to 30 seconds)
    checkServerReady(60, 500).then(ready => {
      if (ready) {
        resolve()
      } else {
        reject(new Error(`Server did not respond after 30s.\n\nServer logs:\n${serverLogs.slice(-20).join('\n')}`))
      }
    })
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
      await mainWindow.loadURL(`http://localhost:${PORT}/en/login`)
    } catch (err) {
      console.error('Failed to start app:', err)
      const errorHtml = `<!DOCTYPE html><html><body style="font-family:monospace;padding:40px;background:#1a1a2e;color:#eee">
        <h1 style="color:#e94560">BitePOS - Server Failed to Start</h1>
        <pre style="background:#16213e;padding:20px;border-radius:8px;overflow:auto;white-space:pre-wrap">${escapeHtml(err.message)}</pre>
        <p>Press Ctrl+Shift+I to open DevTools for more details.</p>
      </body></html>`
      mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(errorHtml))
    }
  }
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
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