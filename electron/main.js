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

// Write logs to a file next to the exe for debugging
const logFile = path.join(app.getPath('userData'), 'bitepos-debug.log')
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  console.log(line.trim())
  try { fs.appendFileSync(logFile, line) } catch {}
}

log(`BitePOS starting | isDev=${isDev} | version=${app.getVersion()}`)
log(`userData=${app.getPath('userData')}`)
log(`exePath=${process.execPath}`)
log(`appPath=${app.getAppPath()}`)

// --- Auto-updater ---
let autoUpdater = null

function setupAutoUpdater() {
  if (isDev) return

  try {
    autoUpdater = require('electron-updater').autoUpdater
  } catch {
    log('electron-updater not available, skipping auto-update')
    return
  }

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.setFeedURL({
    provider: 'generic',
    url: 'https://updates.bitepos.com'
  })

  autoUpdater.on('checking-for-update', () => {
    log('Checking for updates...')
    sendToWindow('update-status', { status: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    log('Update available: ' + info.version)
    sendToWindow('update-status', { status: 'available', version: info.version })
  })

  autoUpdater.on('update-not-available', () => {
    log('App is up to date')
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
    log('Update downloaded: ' + info.version)
    sendToWindow('update-status', { status: 'downloaded', version: info.version })
  })

  autoUpdater.on('error', (err) => {
    log('Update error: ' + err.message)
    sendToWindow('update-status', { status: 'error', error: err.message })
  })

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(err => {
      log('Update check failed: ' + err.message)
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

// Loading screen HTML shown while server starts
const loadingHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body { margin:0; display:flex; align-items:center; justify-content:center; height:100vh; background:#1a1a2e; color:#eee; font-family:system-ui; }
  .spinner { width:40px; height:40px; border:4px solid #333; border-top:4px solid #e94560; border-radius:50%; animation:spin 1s linear infinite; margin-right:16px; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .text { font-size:18px; }
</style></head><body><div class="spinner"></div><div class="text">Starting BitePOS...</div></body></html>`

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
    backgroundColor: '#1a1a2e',
    show: true,
  })

  // Show loading screen immediately
  mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(loadingHtml))

  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

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
        if (res.statusCode === 200) {
          res.resume()
          resolve(true)
        } else if (attempts >= maxAttempts) {
          res.resume()
          resolve(false)
        } else {
          setTimeout(check, intervalMs)
        }
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

    // Find standalone directory
    let standaloneDir
    if (isAsar) {
      // ASAR: native modules are unpacked to .asar.unpacked
      standaloneDir = appPath.replace('.asar', '.asar.unpacked') + '/.next/standalone'
    } else {
      standaloneDir = path.join(appPath, '.next', 'standalone')
    }

    const serverFile = path.join(standaloneDir, 'server.js')
    const dbPath = path.join(standaloneDir, 'dev.db')

    log('=== BITEPOS PATHS ===')
    log('appPath: ' + appPath)
    log('isAsar: ' + isAsar)
    log('standaloneDir: ' + standaloneDir)
    log('serverFile: ' + serverFile)
    log('serverFile exists: ' + fs.existsSync(serverFile))
    log('dbPath: ' + dbPath)
    log('dbPath exists: ' + fs.existsSync(dbPath))

    // List what's actually in the standalone dir
    try {
      const entries = fs.readdirSync(standaloneDir)
      log('standaloneDir contents: ' + entries.join(', '))
      const nextDir = path.join(standaloneDir, '.next')
      if (fs.existsSync(nextDir)) {
        log('.next/ contents: ' + fs.readdirSync(nextDir).join(', '))
        const staticDir = path.join(nextDir, 'static')
        if (fs.existsSync(staticDir)) {
          log('.next/static/ contents: ' + fs.readdirSync(staticDir).join(', '))
        } else {
          log('WARNING: .next/static/ NOT FOUND in standalone dir')
        }
      } else {
        log('WARNING: .next/ NOT FOUND in standalone dir')
      }
    } catch (e) {
      log('Error listing standalone dir: ' + e.message)
    }
    log('=== END PATHS ===')

    if (!fs.existsSync(serverFile)) {
      // Try alternate locations
      const altPaths = [
        path.join(appPath, '.next', 'standalone', 'server.js'),
        path.join(path.dirname(appPath), '.next', 'standalone', 'server.js'),
      ]
      for (const alt of altPaths) {
        log('Trying alternate: ' + alt + ' exists=' + fs.existsSync(alt))
        if (fs.existsSync(alt)) {
          standaloneDir = path.dirname(alt)
          break
        }
      }
      if (!fs.existsSync(path.join(standaloneDir, 'server.js'))) {
        reject(new Error(`server.js not found. Tried:\n  ${serverFile}\n  ${altPaths.join('\n  ')}`))
        return
      }
    }

    // Build the server environment
    const serverEnv = {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: 'production',
      HOSTNAME: 'localhost',
      DATABASE_URL: `file:${dbPath}`,
      ELECTRON_RUN_AS_NODE: '1',
      NEXT_PUBLIC_LICENSE_SERVER: process.env.NEXT_PUBLIC_LICENSE_SERVER || 'https://bitepos-cloud-production.up.railway.app',
    }

    // JWT_SECRET: use env var or generate a stable one per install
    if (!serverEnv.JWT_SECRET) {
      const crypto = require('crypto')
      serverEnv.JWT_SECRET = crypto.createHash('sha256').update(appPath + '-bitepos-jwt').digest('hex')
      log('Generated stable JWT_SECRET from app path')
    }

    log('Starting Next.js server...')
    log('  cwd: ' + standaloneDir)
    log('  cmd: ' + process.execPath + ' ' + serverFile)
    log('  PORT: ' + PORT)
    log('  DATABASE_URL: ' + serverEnv.DATABASE_URL)

    nextProcess = spawn(process.execPath, [serverFile], {
      cwd: standaloneDir,
      env: serverEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    nextProcess.stdout.on('data', (data) => {
      const output = data.toString()
      serverLogs.push(output)
      log('Next.js stdout: ' + output.trim())
    })

    nextProcess.stderr.on('data', (data) => {
      const output = data.toString()
      serverLogs.push('[STDERR] ' + output)
      log('Next.js stderr: ' + output.trim())
    })

    nextProcess.on('error', (err) => {
      log('Failed to start Next.js: ' + err.message)
      reject(err)
    })

    nextProcess.on('exit', (code, signal) => {
      log(`Next.js process exited with code=${code} signal=${signal}`)
      if (code !== 0 && code !== null) {
        serverLogs.push(`Process exited with code ${code}`)
      }
    })

    // Wait for server to respond (up to 30 seconds)
    checkServerReady(60, 500).then(ready => {
      if (ready) {
        log('Server is ready!')
        resolve()
      } else {
        log('Server failed to respond after 30s')
        reject(new Error(`Server did not respond after 30s.\n\nServer logs:\n${serverLogs.slice(-30).join('\n')}`))
      }
    })
  })
}

async function loadApp() {
  if (isDev) {
    try {
      await mainWindow.loadURL(`http://localhost:${PORT}/en/login`)
    } catch {
      log('Waiting for Next.js server...')
      setTimeout(() => loadApp(), 2000)
    }
  } else {
    try {
      await startNextServer()
      log('Loading app URL: http://localhost:' + PORT + '/en/login')
      await mainWindow.loadURL(`http://localhost:${PORT}/en/login`)
      log('App loaded successfully')
    } catch (err) {
      log('Failed to start app: ' + err.message)
      const errorHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body { font-family:monospace; padding:40px; background:#1a1a2e; color:#eee; }
  h1 { color:#e94560; }
  pre { background:#16213e; padding:20px; border-radius:8px; overflow:auto; white-space:pre-wrap; max-height:60vh; }
  .log { font-size:12px; color:#aaa; margin-top:20px; }
</style></head><body>
  <h1>BitePOS - Server Failed to Start</h1>
  <pre>${escapeHtml(err.message)}</pre>
  <p class="log">Debug log: ${escapeHtml(logFile)}</p>
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