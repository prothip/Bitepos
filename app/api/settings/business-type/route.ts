import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getFeaturesForBusiness, DEFAULT_FEATURES, type BusinessType, type FeatureFlags } from '@/lib/business-types'

// Public endpoint — no auth required (used by redirect logic before login)
export async function GET() {
  const btSetting = await prisma.settings.findUnique({ where: { key: 'businessType' } })
  const overrideSetting = await prisma.settings.findUnique({ where: { key: 'featureOverrides' } })

  const businessType = (btSetting?.value || null) as BusinessType | null
  const overrides: Partial<FeatureFlags> = overrideSetting?.value ? JSON.parse(overrideSetting.value) : {}

  const featureFlags = businessType
    ? { ...getFeaturesForBusiness(businessType), ...overrides }
    : { ...DEFAULT_FEATURES, ...overrides }

  return NextResponse.json({ businessType, overrides, featureFlags })
}

import { NextRequest } from 'next/server'
import { checkApiAuth } from '@/lib/with-auth'

export async function PUT(req: NextRequest) {
  const authErr = checkApiAuth(req); if (authErr) return authErr
  const body = await req.json()
  const { businessType, overrides } = body as {
    businessType?: BusinessType
    overrides?: Partial<FeatureFlags>
  }

  const operations = []

  if (businessType) {
    operations.push(
      prisma.settings.upsert({
        where: { key: 'businessType' },
        update: { value: businessType },
        create: { key: 'businessType', value: businessType },
      })
    )
  }

  if (overrides !== undefined) {
    operations.push(
      prisma.settings.upsert({
        where: { key: 'featureOverrides' },
        update: { value: JSON.stringify(overrides) },
        create: { key: 'featureOverrides', value: JSON.stringify(overrides) },
      })
    )
  }

  if (operations.length > 0) await prisma.$transaction(operations)

  // Return computed flags
  const btSetting2 = businessType
    ? null
    : await prisma.settings.findUnique({ where: { key: 'businessType' } })
  const bt = businessType || (btSetting2?.value as BusinessType)

  const overrideSetting2 = overrides !== undefined
    ? null
    : await prisma.settings.findUnique({ where: { key: 'featureOverrides' } })
  const currentOverrides = overrides !== undefined
    ? overrides
    : (overrideSetting2 ? JSON.parse(overrideSetting2.value) : {})

  const featureFlags = bt
    ? { ...getFeaturesForBusiness(bt), ...currentOverrides }
    : { ...DEFAULT_FEATURES, ...currentOverrides }

  return NextResponse.json({ businessType: bt, overrides: currentOverrides, featureFlags })
}