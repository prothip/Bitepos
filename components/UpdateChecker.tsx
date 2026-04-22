'use client'

import { useState, useEffect } from 'react'
import { Download, RefreshCw, CheckCircle2, AlertCircle, Upload } from 'lucide-react'

type UpdateStatus = 'idle' | 'checking' | 'up-to-date' | 'available' | 'downloading' | 'downloaded' | 'error'

export default function UpdateChecker() {
  // Don't render if not in Electron
  const [isElectron, setIsElectron] = useState(false)
  const [status, setStatus] = useState<UpdateStatus>('idle')
  const [version, setVersion] = useState('')
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && !!window.electronAPI)
  }, [])

  useEffect(() => {
    if (!isElectron || !window.electronAPI?.onUpdateStatus) return
    window.electronAPI.onUpdateStatus((data: any) => {
      setStatus(data.status)
      if (data.version) setVersion(data.version)
      if (data.percent) setProgress(data.percent)
      if (data.error) setErrorMsg(data.error)
    })
  }, [isElectron])

  if (!isElectron) return null

  async function checkForUpdates() {
    setStatus('checking')
    setErrorMsg('')
    try {
      await window.electronAPI?.checkForUpdates?.()
    } catch (err: any) {
      setStatus('error')
      setErrorMsg(err.message)
    }
  }

  async function downloadUpdate() {
    setStatus('downloading')
    setProgress(0)
    try {
      await window.electronAPI?.downloadUpdate?.()
    } catch (err: any) {
      setStatus('error')
      setErrorMsg(err.message)
    }
  }

  async function installUpdate() {
    await window.electronAPI?.installUpdate?.()
  }

  const statusConfig: Record<UpdateStatus, { icon: any; text: string; color: string }> = {
    idle: { icon: RefreshCw, text: 'Check for Updates', color: 'text-gray-600' },
    checking: { icon: RefreshCw, text: 'Checking...', color: 'text-blue-600' },
    'up-to-date': { icon: CheckCircle2, text: 'You\'re up to date!', color: 'text-green-600' },
    available: { icon: Upload, text: `Update available: v${version}`, color: 'text-orange-600' },
    downloading: { icon: Download, text: `Downloading... ${progress}%`, color: 'text-blue-600' },
    downloaded: { icon: Upload, text: `v${version} ready to install`, color: 'text-green-600' },
    error: { icon: AlertCircle, text: errorMsg || 'Update failed', color: 'text-red-600' },
  }

  const { icon: Icon, text, color } = statusConfig[status]

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <RefreshCw className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-gray-800">Software Update</h2>
      </div>

      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 ${color}`}>
          <Icon className={`w-5 h-5 ${status === 'checking' || status === 'downloading' ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium">{text}</span>
        </div>

        {status === 'downloading' && (
          <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
            <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        <div className="flex gap-2 ml-auto">
          {(status === 'idle' || status === 'up-to-date' || status === 'error') && (
            <button onClick={checkForUpdates} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90">
              Check Now
            </button>
          )}
          {status === 'available' && (
            <button onClick={downloadUpdate} className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:opacity-90 flex items-center gap-2">
              <Download className="w-4 h-4" /> Download Update
            </button>
          )}
          {status === 'downloaded' && (
            <button onClick={installUpdate} className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:opacity-90 flex items-center gap-2">
              <Upload className="w-4 h-4" /> Install & Restart
            </button>
          )}
        </div>
      </div>
    </div>
  )
}