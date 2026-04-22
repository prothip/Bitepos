// BitePOS License Client
// Checks license on startup and heartbeats periodically

const LICENSE_SERVER = process.env.NEXT_PUBLIC_LICENSE_SERVER || 'http://localhost:3500'
const MACHINE_ID_KEY = 'bitepos_machine_id'
const LICENSE_TOKEN_KEY = 'bitepos_license_token'
const LAST_ONLINE_KEY = 'bitepos_last_online'
const OFFLINE_GRACE_DAYS = 7

function getMachineId(): string {
  if (typeof window === 'undefined') return 'ssr'
  let id = localStorage.getItem(MACHINE_ID_KEY)
  if (!id) {
    // Generate a stable machine ID from browser fingerprint
    const nav = navigator
    const screen = window.screen
    const raw = `${nav.userAgent}-${nav.language}-${screen.width}x${screen.height}-${screen.colorDepth}-${Intl.DateTimeFormat().resolvedOptions().timeZone}`
    id = 'M-' + Array.from(new TextEncoder().encode(raw)).reduce((h, b) => h + b.toString(16).padStart(2, '0'), '').slice(0, 16).toUpperCase()
    localStorage.setItem(MACHINE_ID_KEY, id)
  }
  return id
}

export interface LicenseState {
  valid: boolean
  tier: string | null
  features: Record<string, boolean> | null
  expiresAt: string | null
  error: string | null
  code: string | null  // EXPIRED, REVOKED, MAX_DEVICES, NO_KEY, OFFLINE
}

export async function activateLicense(key: string): Promise<LicenseState> {
  const machineId = getMachineId()
  const machineName = typeof navigator !== 'undefined' ? navigator.userAgent.split(' ').pop() || 'Unknown' : 'Unknown'
  
  try {
    const res = await fetch(`${LICENSE_SERVER}/api/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, machine_id: machineId, machine_name: machineName }),
    })
    const data = await res.json()
    
    if (!res.ok) {
      return { valid: false, tier: null, features: null, expiresAt: null, error: data.error, code: data.code || 'ACTIVATION_FAILED' }
    }
    
    localStorage.setItem(LICENSE_TOKEN_KEY, data.token)
    localStorage.setItem(LAST_ONLINE_KEY, new Date().toISOString())
    return { valid: true, tier: data.tier, features: data.features, expiresAt: data.expires_at, error: null, code: null }
  } catch (e) {
    // Offline mode — check if we have a cached token
    const cached = localStorage.getItem(LICENSE_TOKEN_KEY)
    if (cached) {
      return { valid: true, tier: 'basic', features: null, expiresAt: null, error: 'Offline mode — using cached license', code: 'OFFLINE' }
    }
    return { valid: false, tier: null, features: null, expiresAt: null, error: 'Cannot reach license server', code: 'OFFLINE' }
  }
}

export async function validateLicense(): Promise<LicenseState> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(LICENSE_TOKEN_KEY) : null
  if (!token) {
    return { valid: false, tier: null, features: null, expiresAt: null, error: 'No license activated', code: 'NO_KEY' }
  }

  try {
    const res = await fetch(`${LICENSE_SERVER}/api/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const data = await res.json()
    
    if (!res.ok) {
      if (data.code === 'TOKEN_EXPIRED') {
        // Need to re-activate
        localStorage.removeItem(LICENSE_TOKEN_KEY)
      }
      return { valid: false, tier: null, features: null, expiresAt: null, error: data.error, code: data.code || 'INVALID' }
    }
    
    localStorage.setItem(LICENSE_TOKEN_KEY, data.token)  // Refresh token
    localStorage.setItem(LAST_ONLINE_KEY, new Date().toISOString())
    const features = data.features || {}  // Enterprise = all features (null from server)
    return { valid: true, tier: data.tier, features, expiresAt: data.expires_at, error: null, code: null }
  } catch {
    // Offline — check grace period
    const lastOnline = localStorage.getItem(LAST_ONLINE_KEY)
    const token = localStorage.getItem(LICENSE_TOKEN_KEY)
    if (token && lastOnline) {
      const daysOffline = Math.floor((Date.now() - new Date(lastOnline).getTime()) / (1000 * 60 * 60 * 24))
      if (daysOffline < OFFLINE_GRACE_DAYS) {
        return { valid: true, tier: 'basic', features: null, expiresAt: null, error: `Offline mode — ${OFFLINE_GRACE_DAYS - daysOffline} grace days left`, code: 'OFFLINE' }
      }
      return { valid: false, tier: null, features: null, expiresAt: null, error: `Offline for ${daysOffline} days — connect to internet to continue`, code: 'OFFLINE_EXPIRED' }
    }
    // No cached token
    return { valid: false, tier: null, features: null, expiresAt: null, error: 'Cannot reach license server', code: 'OFFLINE' }
  }
}

export function getLicenseToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem(LICENSE_TOKEN_KEY) : null
}

export function clearLicense(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LICENSE_TOKEN_KEY)
  }
}

export function isEnterprise(tier: string | null): boolean {
  return tier === 'enterprise'
}

// Merge license features with business type features
// License features act as a ceiling — if license says no, business type can't override
export function mergeFeatures(
  licenseFeatures: Record<string, boolean> | null,
  businessFeatures: Record<string, boolean>
): Record<string, boolean> {
  if (!licenseFeatures) return businessFeatures  // Enterprise = no restrictions
  const merged = { ...businessFeatures }
  for (const [key, allowed] of Object.entries(licenseFeatures)) {
    if (!allowed && key in merged) {
      merged[key] = false  // License restricts it
    }
  }
  return merged
}