const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Printing
  printReceipt: (receiptData) => ipcRenderer.invoke('print-receipt', receiptData),

  // Hardware
  openCashDrawer: () => ipcRenderer.invoke('open-cash-drawer'),

  // Updates
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update-status', (_event, data) => callback(data))
  },

  // Check if running in Electron
  isElectron: true,
})

// Type declarations are added via a global type file