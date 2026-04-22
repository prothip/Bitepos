import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getFeaturesForBusiness, DEFAULT_FEATURES, type BusinessType, type FeatureFlags } from '@/lib/business-types'

// Public endpoint — no auth required (needed by POS/layout before full auth)
export async function GET() {
  const btSetting = await prisma.settings.findUnique({ where: { key: 'businessType' } })
  const overrideSetting = await prisma.settings.findUnique({ where: { key: 'featureOverrides' } })

  const businessType = (btSetting?.value || null) as BusinessType | null
  const overrides: Partial<FeatureFlags> = overrideSetting?.value ? JSON.parse(overrideSetting.value) : {}

  const featureFlags = businessType
    ? { ...getFeaturesForBusiness(businessType), ...overrides }
    : { ...DEFAULT_FEATURES, ...overrides }

  return NextResponse.json(featureFlags)
}