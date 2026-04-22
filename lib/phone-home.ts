/**
 * BitePOS Phone-Home Client
 * Connects to BitePOS Cloud for license validation and health reporting
 */

const CLOUD_URL = process.env.NEXT_PUBLIC_CLOUD_URL || 'https://cloud.bitepos.com'
const HEARTBEAT_INTERVAL = 4 * 60 * 60 * 1000 // 4 hours

let licenseKey: string | null = null
let deviceId: string | null = null
let heartbeatTimer: ReturnType<typeof setInterval> | null = null

function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server'
  let id = localStorage.getItem('bitepos_device_id')
  if (!id) {
    // Generate a stable device fingerprint
    const nav = navigator
    id = `bpos-${nav.platform}-${screen.width}x${screen.height}-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem('bitepos_device_id', id)
  }
  return id
}

/**
 * Activate license with the cloud server
 */
export async function activateLicense(key: string): Promise<{
  valid: boolean
  plan?: string
  expiresAt?: string | null
  customerName?: string
  error?: string
}> {
  const device = getDeviceId()
  deviceId = device
  licenseKey = key

  try {
    const res = await fetch(`${CLOUD_URL}/api/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseKey: key,
        deviceId: device,
        deviceName: typeof navigator !== 'undefined' ? navigator.userAgent.split(' ').slice(-2).join(' ') : 'Unknown',
        appVersion: '1.0.0',
      }),
    })

    const data = await res.json()
    if (res.ok && data.valid) {
      localStorage.setItem('bitepos_license_key', key)
      localStorage.setItem('bitepos_license_plan', data.plan || 'starter')
      localStorage.setItem('bitepos_license_expires', data.expiresAt || '')
      startHeartbeat()
    }
    return data
  } catch {
    return { valid: false, error: 'Cannot reach license server' }
  }
}

/**
 * Validate current license on startup
 */
export async function validateLicense(): Promise<{
  valid: boolean
  plan?: string
  expiresAt?: string | null
  revoked?: boolean
  expired?: boolean
}> {
  const key = localStorage.getItem('bitepos_license_key')
  if (!key) return { valid: false }

  licenseKey = key
  deviceId = getDeviceId()

  try {
    const res = await fetch(`${CLOUD_URL}/api/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey: key, deviceId }),
    })

    const data = await res.json()
    if (data.valid) {
      startHeartbeat()
    }
    return data
  } catch {
    // If server unreachable, allow offline use if previously activated
    const cached = localStorage.getItem('bitepos_license_plan')
    if (cached) return { valid: true, plan: cached }
    return { valid: false }
  }
}

/**
 * Send heartbeat to cloud server
 */
export async function sendHeartbeat(extra?: {
  status?: string
  message?: string
  dbSize?: number
  orderCount?: number
  branchCount?: number
}): Promise<void> {
  if (!deviceId) deviceId = getDeviceId()
  if (!licenseKey) licenseKey = localStorage.getItem('bitepos_license_key')

  try {
    await fetch(`${CLOUD_URL}/api/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseKey,
        deviceId,
        appVersion: '1.0.0',
        status: extra?.status || 'ok',
        message: extra?.message || null,
        dbSize: extra?.dbSize || null,
        orderCount: extra?.orderCount || null,
        branchCount: extra?.branchCount || null,
      }),
    })
  } catch {
    // Silent fail — heartbeat is non-critical
  }
}

/**
 * Start periodic heartbeat
 */
function startHeartbeat() {
  if (heartbeatTimer) clearInterval(heartbeatTimer)
  // Send first heartbeat after 30s
  setTimeout(() => sendHeartbeat(), 30 * 1000)
  // Then every 4 hours
  heartbeatTimer = setInterval(() => sendHeartbeat(), HEARTBEAT_INTERVAL)
}

/**
 * Get stored license info
 */
export function getLicenseInfo() {
  return {
    key: localStorage.getItem('bitepos_license_key') || '',
    plan: localStorage.getItem('bitepos_license_plan') || 'trial',
    expiresAt: localStorage.getItem('bitepos_license_expires') || '',
  }
}

/**
 * Clear license (logout)
 */
export function clearLicense() {
  localStorage.removeItem('bitepos_license_key')
  localStorage.removeItem('bitepos_license_plan')
  localStorage.removeItem('bitepos_license_expires')
  licenseKey = null
  if (heartbeatTimer) clearInterval(heartbeatTimer)
}