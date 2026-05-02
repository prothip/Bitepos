const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const http = require('http')
const fs = require('fs')
const os = require('os')

let mainWindow
let nextProcess

const isDev = process.env.NODE_ENV !== 'production' || process.env.OPENCLAW_DEV === '1'
const PORT = process.env.PORT || 3331

// Debug logging — write to multiple locations so we can always find it
const debugInfo = []
let logPath = null

// Determine log path immediately — before app is ready
try {
  const appDataDir = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'bitepos-pos')
  if (!fs.existsSync(appDataDir)) fs.mkdirSync(appDataDir, { recursive: true })
  logPath = path.join(appDataDir, 'bitepos-debug.log')
} catch (e) {
  // Fallback: next to the exe
  logPath = path.join(path.dirname(process.execPath), 'bitepos-debug.log')
}

function dbg(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`
  debugInfo.push(line)
  console.log(line)
  try {
    fs.appendFileSync(logPath, line + '\n')
  } catch (e) {
    try {
      const tmpLog = path.join(os.tmpdir(), 'bitepos-debug.log')
      fs.appendFileSync(tmpLog, line + '\n')
    } catch (e2) {
      console.error('Cannot write log anywhere:', e.message)
    }
  }
}

try {
  dbg(`BitePOS starting | isDev=${isDev} | version=${app.getVersion()}`)
  dbg(`Log file: ${logPath}`)
  dbg(`userData=${app.getPath('userData')}`)
  dbg(`exePath=${process.execPath}`)
  dbg(`appPath=${app.getAppPath()}`)
  dbg(`platform=${process.platform} arch=${process.arch}`)
} catch (e) {
  console.error('Startup error:', e)
  try { fs.appendFileSync(logPath, 'FATAL STARTUP ERROR: ' + e.message + '\n' + e.stack) } catch {}
}

// --- Auto-updater ---
let autoUpdater = null

function setupAutoUpdater() {
  if (isDev) return
  try {
    autoUpdater = require('electron-updater').autoUpdater
  } catch { return }
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.setFeedURL({ provider: 'generic', url: 'https://updates.bitepos.com' })
  autoUpdater.on('error', (err) => { dbg('Update error: ' + err.message) })
  setTimeout(() => { autoUpdater.checkForUpdates().catch(() => {}) }, 3000)
  setInterval(() => { autoUpdater.checkForUpdates().catch(() => {}) }, 4 * 60 * 60 * 1000)
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
    backgroundColor: '#1a1a2e',
    show: true,
  })

  loadStatusPage('Starting BitePOS...')

  if (isDev) mainWindow.webContents.openDevTools()

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

function loadStatusPage(message, isError = false) {
  const color = isError ? '#e94560' : '#00d2ff'
  const debugHtml = debugInfo.map(l => `<div>${escapeHtml(l)}</div>`).join('')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body { margin:0; padding:40px; background:#1a1a2e; color:#eee; font-family:monospace; }
  .status { color:${color}; font-size:24px; margin-bottom:20px; }
  .spinner { display:inline-block; width:20px; height:20px; border:3px solid #333; border-top:3px solid ${color}; border-radius:50%; animation:spin 1s linear infinite; margin-right:10px; vertical-align:middle; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .debug { margin-top:20px; padding:15px; background:#16213e; border-radius:8px; font-size:12px; color:#aaa; max-height:60vh; overflow:auto; }
  .error { background:#2d1b1b; padding:15px; border-radius:8px; margin-top:20px; color:#e94560; white-space:pre-wrap; }
</style></head><body>
  <div class="status">${isError ? '' : '<span class="spinner"></span>'}${escapeHtml(message)}</div>
  <div class="debug">${debugHtml}</div>
</body></html>`
  mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
}

function checkServerReady(maxAttempts, intervalMs) {
  return new Promise((resolve) => {
    let attempts = 0
    const check = () => {
      attempts++
      const req = http.get(`http://localhost:${PORT}/api/health`, (res) => {
        if (res.statusCode === 200) {
          res.resume()
          resolve(true)
        } else {
          res.resume()
          if (attempts >= maxAttempts) resolve(false)
          else setTimeout(check, intervalMs)
        }
      })
      req.on('error', () => {
        if (attempts >= maxAttempts) resolve(false)
        else setTimeout(check, intervalMs)
      })
      req.setTimeout(2000, () => {
        req.destroy()
        if (attempts >= maxAttempts) resolve(false)
        else setTimeout(check, intervalMs)
      })
    }
    check()
  })
}

function findStandaloneDir() {
  const appPath = app.getAppPath()
  const isAsar = appPath.includes('.asar')

  dbg('--- FINDING STANDALONE DIR ---')
  dbg('appPath: ' + appPath)
  dbg('isAsar: ' + isAsar)
  dbg('process.resourcesPath: ' + process.resourcesPath)
  dbg('process.execPath: ' + process.execPath)

  // List candidate paths and check each one
  const candidates = []

  // PREFERRED: extraResources puts standalone at resources/standalone/
  // This is the real filesystem — no ASAR issues for the Node.js server
  const resDir = process.resourcesPath
  candidates.push(path.join(resDir, 'standalone'))

  if (isAsar) {
    // Fallback: asarUnpack locations
    const unpackedBase = appPath.replace(/\.asar.*/, '.asar.unpacked')
    candidates.push(path.join(unpackedBase, '.next', 'standalone'))
    candidates.push(path.join(resDir, 'app.asar.unpacked', '.next', 'standalone'))

    // Try relative to exe (Windows NSIS installs to Program Files)
    const exeDir = path.dirname(process.execPath)
    candidates.push(path.join(exeDir, 'resources', 'standalone'))
    candidates.push(path.join(exeDir, 'resources', 'app.asar.unpacked', '.next', 'standalone'))
  } else {
    candidates.push(path.join(appPath, '.next', 'standalone'))
  }

  for (const c of candidates) {
    const exists = fs.existsSync(c)
    dbg('  candidate: ' + c + ' -> ' + (exists ? 'EXISTS' : 'not found'))
    if (exists) return c
  }

  // If none found, search the resources directory tree
  dbg('No candidate found, searching resources...')
  try {
    if (fs.existsSync(resDir)) {
      dbg('resourcesPath contents: ' + fs.readdirSync(resDir).join(', '))
    }
  } catch (e) {
    dbg('Error searching resources: ' + e.message)
  }

  return null
}

function startNextServer() {
  return new Promise((resolve, reject) => {
    const standaloneDir = findStandaloneDir()

    if (!standaloneDir) {
      const msg = 'Cannot find .next/standalone directory!\n\nappPath: ' + app.getAppPath() + '\nresourcesPath: ' + process.resourcesPath + '\n\nLog: ' + logPath
      dbg('FATAL: ' + msg)
      try { dialog.showErrorBox('BitePOS - Server Not Found', msg) } catch {}
      reject(new Error(msg))
      return
    }

    const serverFile = path.join(standaloneDir, 'server.js')
    const dbPath = path.join(standaloneDir, 'dev.db')

    dbg('Using standaloneDir: ' + standaloneDir)
    dbg('serverFile exists: ' + fs.existsSync(serverFile))
    dbg('dbPath exists: ' + fs.existsSync(dbPath))

    // Ensure .next/static exists in standalone dir (blank page if missing)
    // The standalone Node.js server cannot read from ASAR, so static must be on real FS
    const staticDir = path.join(standaloneDir, '.next', 'static')
    const staticExists = fs.existsSync(staticDir)
    dbg('.next/static exists: ' + staticExists)
    if (staticExists) {
      try { dbg('.next/static contents: ' + fs.readdirSync(staticDir).join(', ')) } catch {}
    } else {
      // Try to copy .next/static from project root (asarUnpack may have placed it elsewhere)
      const appPath = app.getAppPath()
      const isAsar = appPath.includes('.asar')
      const possibleStaticSources = []

      if (isAsar) {
        const unpackedBase = appPath.replace(/\.asar.*/, '.asar.unpacked')
        possibleStaticSources.push(path.join(unpackedBase, '.next', 'static'))
        possibleStaticSources.push(path.join(process.resourcesPath, 'app.asar.unpacked', '.next', 'static'))
      }
      possibleStaticSources.push(path.join(appPath, '.next', 'static'))
      possibleStaticSources.push(path.join(path.dirname(process.execPath), 'resources', 'app.asar.unpacked', '.next', 'static'))

      let copied = false
      for (const src of possibleStaticSources) {
        dbg('Trying static source: ' + src + ' -> ' + fs.existsSync(src))
        if (fs.existsSync(src)) {
          try {
            const targetStatic = path.join(standaloneDir, '.next')
            if (!fs.existsSync(targetStatic)) fs.mkdirSync(targetStatic, { recursive: true })
            fs.cpSync(src, staticDir, { recursive: true })
            dbg('✅ Copied .next/static from ' + src + ' to ' + staticDir)
            copied = true
            break
          } catch (e) {
            dbg('Failed to copy static from ' + src + ': ' + e.message)
          }
        }
      }

      if (!copied) {
        dbg('⚠️ WARNING: .next/static not found anywhere! UI will likely be blank.')
        dbg('Checked: ' + possibleStaticSources.join(', '))
      }
    }

    // Also ensure /public exists in standalone dir (favicon, icons, etc.)
    const publicDir = path.join(standaloneDir, 'public')
    if (!fs.existsSync(publicDir)) {
      const appPath2 = app.getAppPath()
      const possiblePublicSources = []
      if (appPath2.includes('.asar')) {
        possiblePublicSources.push(path.join(appPath2.replace(/\.asar.*/, '.asar.unpacked'), 'public'))
        possiblePublicSources.push(path.join(process.resourcesPath, 'app.asar.unpacked', 'public'))
      }
      possiblePublicSources.push(path.join(appPath2, 'public'))

      for (const src of possiblePublicSources) {
        if (fs.existsSync(src)) {
          try {
            fs.cpSync(src, publicDir, { recursive: true })
            dbg('✅ Copied public from ' + src)
            break
          } catch (e) { dbg('Failed to copy public: ' + e.message) }
        }
      }
    }

    // List standalone dir contents
    try {
      dbg('standaloneDir contents: ' + fs.readdirSync(standaloneDir).join(', '))
      const nextDir = path.join(standaloneDir, '.next')
      if (fs.existsSync(nextDir)) {
        dbg('.next/ contents: ' + fs.readdirSync(nextDir).join(', '))
      }
    } catch (e) {
      dbg('Error listing dirs: ' + e.message)
    }

    if (!fs.existsSync(serverFile)) {
      const msg = 'server.js NOT FOUND at: ' + serverFile + '\n\nApp path: ' + app.getAppPath()
      dbg('FATAL: ' + msg)
      try { dialog.showErrorBox('BitePOS - Server Not Found', msg + '\n\nLog: ' + logPath) } catch {}
      reject(new Error(msg))
      return
    }

    // Build the server environment
    const serverEnv = {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: 'production',
      HOSTNAME: 'localhost',
      DATABASE_URL: 'file:' + dbPath,
      ELECTRON_RUN_AS_NODE: '1',
      NEXT_PUBLIC_LICENSE_SERVER: process.env.NEXT_PUBLIC_LICENSE_SERVER || 'https://bitepos-cloud-production.up.railway.app',
    }

    // JWT_SECRET: generate stable one from app path
    if (!serverEnv.JWT_SECRET) {
      try {
        const crypto = require('crypto')
        serverEnv.JWT_SECRET = crypto.createHash('sha256').update(standaloneDir + '-bitepos-jwt').digest('hex')
        dbg('Generated JWT_SECRET')
      } catch (e) {
        dbg('Cannot generate JWT_SECRET: ' + e.message)
      }
    }

    dbg('Starting server...')
    dbg('  execPath: ' + process.execPath)
    dbg('  cwd: ' + standaloneDir)
    dbg('  PORT: ' + PORT)

    loadStatusPage('Starting server...')

    // process.execPath with ELECTRON_RUN_AS_NODE=1 spawns Node.js from the Electron binary
    nextProcess = spawn(process.execPath, [serverFile], {
      cwd: standaloneDir,
      env: serverEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let serverOutput = []
    nextProcess.stdout.on('data', (data) => {
      const output = data.toString().trim()
      serverOutput.push(output)
      dbg('Server stdout: ' + output)
    })

    nextProcess.stderr.on('data', (data) => {
      const output = data.toString().trim()
      serverOutput.push('[STDERR] ' + output)
      dbg('Server stderr: ' + output)
    })

    nextProcess.on('error', (err) => {
      dbg('Server spawn error: ' + err.message)
      try { dialog.showErrorBox('BitePOS - Server Error', 'Failed to start server: ' + err.message + '\n\nLog: ' + logPath) } catch {}
      reject(err)
    })

    let serverExited = false
    nextProcess.on('exit', (code, signal) => {
      serverExited = true
      const exitMsg = `Server exited: code=${code} signal=${signal}`
      dbg(exitMsg)
      if (code !== 0 && code !== null) {
        const errOutput = serverOutput.slice(-10).join('\n')
        dbg('Server crash output: ' + errOutput)
        try { dialog.showErrorBox('BitePOS - Server Crashed', exitMsg + '\n\n' + errOutput + '\n\nLog: ' + logPath) } catch {}
        reject(new Error('Server crashed with code ' + code + '\n\nOutput:\n' + errOutput))
      }
    })

    // Wait for server (30 seconds)
    checkServerReady(60, 500).then(ready => {
      if (ready) {
        dbg('Server health check passed!')
        resolve()
      } else {
        dbg('Server NOT ready after 30s (exited=' + serverExited + ')')
        const errOutput = serverOutput.slice(-15).join('\n')
        if (serverExited) {
          reject(new Error('Server crashed during startup\n\nOutput:\n' + errOutput))
        } else {
          nextProcess.kill()
          reject(new Error('Server did not respond after 30s\n\nOutput:\n' + errOutput))
        }
      }
    })
  })
}

async function loadApp() {
  if (isDev) {
    try {
      await mainWindow.loadURL(`http://localhost:${PORT}/en/login`)
    } catch {
      dbg('Waiting for dev server...')
      setTimeout(() => loadApp(), 2000)
    }
  } else {
    try {
      loadStatusPage('Starting server...')
      await startNextServer()
      dbg('Loading app URL...')
      await mainWindow.loadURL(`http://localhost:${PORT}/en/login`)

      // Watch for server crashes after initial load
      if (nextProcess) {
        nextProcess.on('exit', (code, signal) => {
          dbg(`Server died after app load: code=${code} signal=${signal}`)
          loadStatusPage(`Server crashed (code ${code}). Restart the app.`, true)
        })
      }

      // After a short delay, check if the page rendered anything
      setTimeout(async () => {
        try {
          const html = await mainWindow.webContents.executeJavaScript('document.body.innerHTML.substring(0, 200)')
          dbg('Page body after load: ' + html)
          if (!html || html.length < 10) {
            dbg('WARNING: Page body is empty!')
            loadStatusPage('Page loaded but body is empty — check debug info', true)
          }
        } catch (e) {
          dbg('Cannot read page body: ' + e.message)
        }
      }, 3000)

    } catch (err) {
      dbg('FAILED: ' + err.message)
      dbg('Stack: ' + err.stack)
      try { dialog.showErrorBox('BitePOS - Startup Failed', err.message + '\n\nLog file: ' + logPath) } catch {}
      loadStatusPage('Server failed to start — see details below', true)
    }
  }
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err)
  try {
    fs.appendFileSync(logPath || path.join(os.tmpdir(), 'bitepos-debug.log'), `[FATAL] ${err.message}\n${err.stack}\n`)
  } catch {}
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog.showErrorBox('BitePOS - Unexpected Error', err.message + '\n\nLog: ' + (logPath || 'unknown'))
    }
  } catch {}
})

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
        { label: 'Check for Updates...', click: () => {
          if (autoUpdater) autoUpdater.checkForUpdates()
        }},
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    { label: 'View', submenu: [
      { role: 'reload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ]},
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) { createWindow(); loadApp() }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (nextProcess) nextProcess.kill()
    app.quit()
  }
})

app.on('before-quit', () => { if (nextProcess) nextProcess.kill() })

// IPC handlers
ipcMain.handle('get-app-version', () => app.getVersion())
ipcMain.handle('print-receipt', async () => { return { success: true } })
ipcMain.handle('open-cash-drawer', async () => { return { success: true } })
ipcMain.handle('check-for-updates', async () => {
  if (!autoUpdater) return { available: false }
  try { const r = await autoUpdater.checkForUpdates(); return { available: !!r } } catch { return { available: false } }
})
ipcMain.handle('download-update', async () => {
  if (!autoUpdater) return { error: 'not available' }
  try { await autoUpdater.downloadUpdate(); return { success: true } } catch (e) { return { error: e.message } }
})
ipcMain.handle('install-update', async () => { if (autoUpdater) autoUpdater.quitAndInstall(false, true) })
ipcMain.handle('get-update-status', async () => { return { status: 'idle' } })