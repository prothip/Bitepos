const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const http = require('http')
const fs = require('fs')

let mainWindow
let nextProcess

const isDev = process.env.NODE_ENV !== 'production' || process.env.OPENCLAW_DEV === '1'
const PORT = process.env.PORT || 3331

// Debug info collected during startup — shown on screen if something goes wrong
const debugInfo = []
function dbg(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`
  debugInfo.push(line)
  console.log(line)
  try {
    const logDir = app.getPath('userData')
    fs.appendFileSync(path.join(logDir, 'bitepos-debug.log'), line + '\n')
  } catch (e) {
    console.error('Cannot write log:', e.message)
  }
}

try {
  dbg(`BitePOS starting | isDev=${isDev} | version=${app.getVersion()}`)
  dbg(`userData=${app.getPath('userData')}`)
  dbg(`exePath=${process.execPath}`)
  dbg(`appPath=${app.getAppPath()}`)
  dbg(`platform=${process.platform} arch=${process.arch}`)
} catch (e) {
  console.error('Startup error:', e)
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

  // Show a status page immediately — we'll update it from IPC
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

function checkServerReady(maxAttempts = 40, intervalMs = 500) {
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

function startNextServer() {
  return new Promise((resolve, reject) => {
    const appPath = app.getAppPath()
    const isAsar = appPath.includes('.asar')

    let standaloneDir
    if (isAsar) {
      standaloneDir = appPath.replace('.asar', '.asar.unpacked') + '/.next/standalone'
    } else {
      standaloneDir = path.join(appPath, '.next', 'standalone')
    }

    const serverFile = path.join(standaloneDir, 'server.js')
    const dbPath = path.join(standaloneDir, 'dev.db')

    dbg('--- PATHS ---')
    dbg('appPath: ' + appPath)
    dbg('isAsar: ' + isAsar)
    dbg('standaloneDir: ' + standaloneDir)
    dbg('serverFile: ' + serverFile)
    dbg('serverFile exists: ' + fs.existsSync(serverFile))
    dbg('dbPath: ' + dbPath)
    dbg('dbPath exists: ' + fs.existsSync(dbPath))

    // List what's actually in the standalone dir
    try {
      if (fs.existsSync(standaloneDir)) {
        dbg('standaloneDir contents: ' + fs.readdirSync(standaloneDir).join(', '))
      } else {
        dbg('standaloneDir DOES NOT EXIST')
        // Try to find it
        const resourcesDir = path.join(process.resourcesPath, 'app')
        dbg('Trying resourcesDir: ' + resourcesDir + ' exists=' + fs.existsSync(resourcesDir))
        if (fs.existsSync(resourcesDir)) {
          dbg('resourcesDir contents: ' + fs.readdirSync(resourcesDir).join(', '))
        }
        // Try the parent directory
        const parentDir = path.dirname(appPath)
        dbg('Parent dir: ' + parentDir)
        if (fs.existsSync(parentDir)) {
          dbg('Parent contents: ' + fs.readdirSync(parentDir).join(', '))
        }
      }
      const nextDir = path.join(standaloneDir, '.next')
      if (fs.existsSync(nextDir)) {
        dbg('.next/ contents: ' + fs.readdirSync(nextDir).join(', '))
      }
    } catch (e) {
      dbg('Error listing dirs: ' + e.message)
    }

    if (!fs.existsSync(serverFile)) {
      reject(new Error('server.js NOT FOUND at: ' + serverFile + '\n\nApp path: ' + appPath))
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
        serverEnv.JWT_SECRET = crypto.createHash('sha256').update(appPath + '-bitepos-jwt').digest('hex')
        dbg('Generated JWT_SECRET')
      } catch (e) {
        dbg('Cannot generate JWT_SECRET: ' + e.message)
      }
    }

    dbg('Starting server...')
    dbg('  cmd: ' + process.execPath)
    dbg('  cwd: ' + standaloneDir)
    dbg('  PORT: ' + PORT)

    loadStatusPage('Starting server...')

    // On Windows in a packaged app, process.execPath is the app exe itself
    // which may not work with ELECTRON_RUN_AS_NODE for spawning Node scripts.
    // Try to find a real node.exe first, fall back to process.execPath.
    let nodePath = process.execPath
    if (process.platform === 'win32') {
      // Check if node is available on PATH
      try {
        const which = require('child_process').execSync('where node 2>nul', { encoding: 'utf8' }).trim()
        if (which) {
          nodePath = which.split('\n')[0].trim()
          dbg('Found system node: ' + nodePath)
        }
      } catch {
        dbg('System node not found, using process.execPath')
      }
    }

    nextProcess = spawn(nodePath, [serverFile], {
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
      reject(err)
    })

    let serverExited = false
    nextProcess.on('exit', (code, signal) => {
      serverExited = true
      dbg(`Server exited: code=${code} signal=${signal}`)
      if (code !== 0 && code !== null) {
        reject(new Error('Server crashed with code ' + code + '\n\nOutput:\n' + serverOutput.slice(-10).join('\n')))
      }
    })

    // Wait for server (30 seconds — first run can be slow on Windows)
    checkServerReady(60, 500).then(ready => {
      if (ready) {
        dbg('Server health check passed!')
        // Now test the actual page
        http.get(`http://localhost:${PORT}/en/login`, (res) => {
          let html = ''
          res.on('data', chunk => html += chunk)
          res.on('end', () => {
            dbg('Login page status: ' + res.statusCode)
            dbg('Login page HTML length: ' + html.length)
            dbg('Login page HTML (first 500 chars): ' + html.substring(0, 500))
            dbg('Has __next div: ' + html.includes('__next'))
            dbg('Has script tags: ' + html.includes('<script'))
            resolve()
          })
        }).on('error', (e) => {
          dbg('Error fetching login page: ' + e.message)
          resolve() // server is up, page might need different handling
        })
      } else {
        dbg('Server NOT ready after 30s (exited=' + serverExited + ')')
        if (serverExited) {
          reject(new Error('Server crashed during startup\n\nOutput:\n' + serverOutput.slice(-15).join('\n')))
        } else {
          // Server process is alive but not responding — kill it and report
          nextProcess.kill()
          reject(new Error('Server did not respond after 30s (process still running)\n\nOutput:\n' + serverOutput.slice(-15).join('\n')))
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
      // Try loading the page
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
            dbg('WARNING: Page body is empty! Loading debug info page...')
            loadStatusPage('Page loaded but body is empty — check debug info', true)
          }
        } catch (e) {
          dbg('Cannot read page body: ' + e.message)
        }
      }, 3000)
      
    } catch (err) {
      dbg('FAILED: ' + err.message)
      loadStatusPage('Server failed to start — see details below', true)
    }
  }
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
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