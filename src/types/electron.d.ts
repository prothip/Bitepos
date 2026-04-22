export {}

declare global {
  interface Window {
    electronAPI?: {
      getAppVersion: () => Promise<string>
      printReceipt: (data: any) => Promise<{ success: boolean }>
      openCashDrawer: () => Promise<{ success: boolean }>
      checkForUpdates: () => Promise<{ available: boolean; version?: string; error?: string }>
      downloadUpdate: () => Promise<{ success?: boolean; error?: string }>
      installUpdate: () => Promise<void>
      onUpdateStatus: (callback: (data: any) => void) => void
      isElectron: boolean
    }
  }
}